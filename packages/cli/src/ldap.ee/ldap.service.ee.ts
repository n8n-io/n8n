import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { LdapConfig } from '@n8n/constants';
import { LDAP_FEATURE_NAME } from '@n8n/constants';
import { isValidEmail, SettingsRepository } from '@n8n/db';
import type { User, RunningMode, SyncStatus } from '@n8n/db';
import { Service, Container } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { QueryFailedError } from '@n8n/typeorm';
import type { Entry as LdapUser, ClientOptions } from 'ldapts';
import { Client } from 'ldapts';
import { Cipher } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';
import type { ConnectionOptions } from 'tls';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { EventService } from '@/events/event.service';
import {
	createLdapUserOnLocalDb,
	getUserByEmail,
	getAuthIdentityByLdapId,
	isLdapEnabled,
	mapLdapAttributesToUser,
	createLdapAuthIdentity,
	updateLdapUserOnLocalDb,
	createFilter,
	deleteAllLdapIdentities,
	escapeFilter,
	formatUrl,
	getLdapIds,
	getLdapUsers,
	getMappingAttributes,
	mapLdapUserToDbUser,
	processUsers,
	resolveBinaryAttributes,
	resolveEntryBinaryAttributes,
	saveLdapSynchronization,
	validateLdapConfigurationSchema,
	getUserByLdapId,
} from '@/ldap.ee/helpers.ee';
import {
	getCurrentAuthenticationMethod,
	isEmailCurrentAuthenticationMethod,
	isLdapCurrentAuthenticationMethod,
	setCurrentAuthenticationMethod,
} from '@/sso.ee/sso-helpers';

import { BINARY_AD_ATTRIBUTES } from './constants';

@Service()
export class LdapService {
	private client: Client | undefined;

	private syncTimer: NodeJS.Timeout | undefined = undefined;

	config: LdapConfig;

	constructor(
		private readonly logger: Logger,
		private readonly settingsRepository: SettingsRepository,
		private readonly cipher: Cipher,
		private readonly eventService: EventService,
	) {}

	async init() {
		const ldapConfig = await this.loadConfig();

		try {
			await this.setGlobalLdapConfigVariables(ldapConfig);
		} catch (error) {
			this.logger.warn(
				`Cannot set LDAP login enabled state when an authentication method other than email or ldap is active (current: ${getCurrentAuthenticationMethod()})`,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				error,
			);
		}

		this.setConfig(ldapConfig);
	}

	/** Retrieve the LDAP configuration (decrypted) from the database */
	async loadConfig() {
		const { value } = await this.settingsRepository.findOneByOrFail({
			key: LDAP_FEATURE_NAME,
		});
		const ldapConfig = jsonParse<LdapConfig>(value);
		ldapConfig.bindingAdminPassword = this.cipher.decrypt(ldapConfig.bindingAdminPassword);
		return ldapConfig;
	}

	async updateConfig(ldapConfig: LdapConfig): Promise<void> {
		const { valid, message } = validateLdapConfigurationSchema(ldapConfig);

		if (!valid) {
			throw new UnexpectedError(message);
		}

		if (ldapConfig.loginEnabled && ['saml', 'oidc'].includes(getCurrentAuthenticationMethod())) {
			throw new BadRequestError('LDAP cannot be enabled if SSO in enabled');
		}

		this.setConfig({ ...ldapConfig });

		ldapConfig.bindingAdminPassword = this.cipher.encrypt(ldapConfig.bindingAdminPassword);

		if (!ldapConfig.loginEnabled) {
			ldapConfig.synchronizationEnabled = false;
			const ldapUsers = await getLdapUsers();
			if (ldapUsers.length) {
				await deleteAllLdapIdentities();
			}
		}

		await this.settingsRepository.update(
			{ key: LDAP_FEATURE_NAME },
			{ value: JSON.stringify(ldapConfig), loadOnStartup: true },
		);
		await this.setGlobalLdapConfigVariables(ldapConfig);
	}

	/** Set the LDAP configuration and expire the current client */
	setConfig(ldapConfig: LdapConfig) {
		this.config = ldapConfig;
		this.client = undefined;
		// If user disabled synchronization in the UI and there a job schedule,
		// stop it
		if (this.syncTimer && !this.config.synchronizationEnabled) {
			this.stopSync();
			// If instance crashed with a job scheduled, once the server starts
			// again, reschedule it.
		} else if (!this.syncTimer && this.config.synchronizationEnabled) {
			this.scheduleSync();
			// If job scheduled and the run interval got updated in the UI
			// stop the current one and schedule a new one with the new internal
		} else if (this.syncTimer && this.config.synchronizationEnabled) {
			this.stopSync();
			this.scheduleSync();
		}
	}

	/** Take the LDAP configuration and set login enabled and login label to the config object */
	private async setGlobalLdapConfigVariables(ldapConfig: LdapConfig): Promise<void> {
		await this.setLdapLoginEnabled(ldapConfig.loginEnabled);
		Container.get(GlobalConfig).sso.ldap.loginLabel = ldapConfig.loginLabel;
	}

	/** Set the LDAP login enabled to the configuration object */
	private async setLdapLoginEnabled(enabled: boolean): Promise<void> {
		const currentAuthenticationMethod = getCurrentAuthenticationMethod();
		if (enabled && !isEmailCurrentAuthenticationMethod() && !isLdapCurrentAuthenticationMethod()) {
			throw new InternalServerError(
				`Cannot switch LDAP login enabled state when an authentication method other than email or ldap is active (current: ${currentAuthenticationMethod})`,
			);
		}

		Container.get(GlobalConfig).sso.ldap.loginEnabled = enabled;

		const targetAuthenticationMethod =
			!enabled && currentAuthenticationMethod === 'ldap' ? 'email' : currentAuthenticationMethod;

		await setCurrentAuthenticationMethod(enabled ? 'ldap' : targetAuthenticationMethod);
	}

	/**
	 * Get new/existing LDAP client,
	 * depending on whether the credentials
	 * were updated or not
	 */
	private async getClient() {
		if (this.config === undefined) {
			throw new UnexpectedError('Service cannot be used without setting the property config');
		}
		if (this.client === undefined) {
			const url = formatUrl(
				this.config.connectionUrl,
				this.config.connectionPort,
				this.config.connectionSecurity,
			);
			const ldapOptions: ClientOptions = { url };
			const tlsOptions: ConnectionOptions = {};

			if (this.config.connectionSecurity !== 'none') {
				Object.assign(tlsOptions, {
					rejectUnauthorized: !this.config.allowUnauthorizedCerts,
				});
				if (this.config.connectionSecurity === 'tls') {
					ldapOptions.tlsOptions = tlsOptions;
				}
			}

			this.client = new Client(ldapOptions);
			if (this.config.connectionSecurity === 'startTls') {
				await this.client.startTLS(tlsOptions);
			}
		}
	}

	/**
	 * Attempt a binding with the admin credentials
	 */
	private async bindAdmin(): Promise<void> {
		await this.getClient();
		if (this.client) {
			await this.client.bind(this.config.bindingAdminDn, this.config.bindingAdminPassword);
		}
	}

	/**
	 * Search the LDAP server using the administrator binding
	 * (if any, else a anonymous binding will be attempted)
	 */
	async searchWithAdminBinding(filter: string): Promise<LdapUser[]> {
		await this.bindAdmin();
		if (this.client) {
			const { searchEntries } = await this.client.search(this.config.baseDn, {
				attributes: getMappingAttributes(this.config),
				explicitBufferAttributes: BINARY_AD_ATTRIBUTES,
				filter,
				timeLimit: this.config.searchTimeout,
				paged: { pageSize: this.config.searchPageSize },
				...(this.config.searchPageSize === 0 && { paged: true }),
			});

			await this.client.unbind();
			return searchEntries;
		}
		return [];
	}

	/**
	 * Attempt binding with the user's credentials
	 */
	async validUser(dn: string, password: string): Promise<void> {
		await this.getClient();
		if (this.client) {
			await this.client.bind(dn, password);
			await this.client.unbind();
		}
	}

	/**
	 * Find and authenticate user in the LDAP server.
	 */
	async findAndAuthenticateLdapUser(
		loginId: string,
		password: string,
		loginIdAttribute: string,
		userFilter: string,
	): Promise<LdapUser | undefined> {
		// Search for the user with the administrator binding using the
		// the Login ID attribute and whatever was inputted in the UI's
		// email input.
		let searchResult: LdapUser[] = [];

		try {
			searchResult = await this.searchWithAdminBinding(
				createFilter(`(${loginIdAttribute}=${escapeFilter(loginId)})`, userFilter),
			);
		} catch (e) {
			if (e instanceof Error) {
				this.eventService.emit('ldap-login-sync-failed', { error: e.message });
				this.logger.error('LDAP - Error during search', { message: e.message });
			}
			return undefined;
		}

		if (!searchResult.length) {
			return undefined;
		}

		// In the unlikely scenario that more than one user is found (
		// can happen depending on how the LDAP database is structured
		// and the LDAP configuration), return the last one found as it
		// should be the less important in the hierarchy.
		let user = searchResult.pop();

		if (user === undefined) {
			user = { dn: '' };
		}

		try {
			// Now with the user distinguished name (unique identifier
			// for the user) and the password, attempt to validate the
			// user by binding
			await this.validUser(user.dn, password);
		} catch (e) {
			if (e instanceof Error) {
				this.logger.error('LDAP - Error validating user against LDAP server', {
					message: e.message,
				});
			}
			return undefined;
		}

		resolveEntryBinaryAttributes(user);

		return user;
	}

	/**
	 * Attempt binding with the administrator credentials, to test the connection
	 */
	async testConnection(): Promise<void> {
		await this.bindAdmin();
	}

	/** Schedule a synchronization job based on the interval set in the LDAP config */
	private scheduleSync(): void {
		if (!this.config.synchronizationInterval) {
			throw new UnexpectedError('Interval variable has to be defined');
		}
		this.syncTimer = setInterval(async () => {
			await this.runSync('live');
		}, this.config.synchronizationInterval * 60000);
	}

	/**
	 * Run the synchronization job.
	 * If the job runs in "live" mode, changes to LDAP users are persisted in the database, else the users are not modified
	 */
	async runSync(mode: RunningMode): Promise<void> {
		this.logger.debug(`LDAP - Starting a synchronization run in ${mode} mode`);

		let adUsers: LdapUser[] = [];

		try {
			adUsers = await this.searchWithAdminBinding(
				createFilter(`(${this.config.loginIdAttribute}=*)`, this.config.userFilter),
			);

			this.logger.debug('LDAP - Users return by the query', {
				users: adUsers,
			});

			resolveBinaryAttributes(adUsers);
		} catch (e) {
			if (e instanceof Error) {
				this.logger.error(`LDAP - ${e.message}`);
				throw e;
			}
		}

		const startedAt = new Date();

		const localAdUsers = await getLdapIds();

		const { usersToCreate, usersToUpdate, usersToDisable } = this.getUsersToProcess(
			adUsers,
			localAdUsers,
		);

		const filteredUsersToCreate = usersToCreate.filter(([id, user]) => {
			if (!isValidEmail(user.email)) {
				this.logger.warn(`LDAP - Invalid email format for user ${id}`);
				return false;
			}
			return true;
		});

		const filteredUsersToUpdate = usersToUpdate.filter(([id, user]) => {
			if (!isValidEmail(user.email)) {
				this.logger.warn(`LDAP - Invalid email format for user ${id}`);
				return false;
			}
			return true;
		});

		this.logger.debug('LDAP - Users to process', {
			created: filteredUsersToCreate.length,
			updated: filteredUsersToUpdate.length,
			disabled: usersToDisable.length,
		});

		const endedAt = new Date();
		let status: SyncStatus = 'success';
		let errorMessage = '';

		try {
			if (mode === 'live') {
				await processUsers(filteredUsersToCreate, filteredUsersToUpdate, usersToDisable);
			}
		} catch (error) {
			if (error instanceof QueryFailedError) {
				status = 'error';
				errorMessage = `${error.message}`;
			}
		}

		await saveLdapSynchronization({
			startedAt,
			endedAt,
			created: filteredUsersToCreate.length,
			updated: filteredUsersToUpdate.length,
			disabled: usersToDisable.length,
			scanned: adUsers.length,
			runMode: mode,
			status,
			error: errorMessage,
		});

		this.eventService.emit('ldap-general-sync-finished', {
			type: !this.syncTimer ? 'scheduled' : `manual_${mode}`,
			succeeded: true,
			usersSynced:
				filteredUsersToCreate.length + filteredUsersToUpdate.length + usersToDisable.length,
			error: errorMessage,
		});

		this.logger.debug('LDAP - Synchronization finished successfully');
	}

	/** Stop the current job scheduled, if any */
	stopSync(): void {
		clearInterval(this.syncTimer);
		this.syncTimer = undefined;
	}

	/** Get all the user that will be changed (created, updated, disabled), in the database */
	private getUsersToProcess(
		adUsers: LdapUser[],
		localAdUsers: string[],
	): {
		usersToCreate: Array<[string, User]>;
		usersToUpdate: Array<[string, User]>;
		usersToDisable: string[];
	} {
		return {
			usersToCreate: this.getUsersToCreate(adUsers, localAdUsers),
			usersToUpdate: this.getUsersToUpdate(adUsers, localAdUsers),
			usersToDisable: this.getUsersToDisable(adUsers, localAdUsers),
		};
	}

	/** Get users in LDAP that are not in the database yet */
	private getUsersToCreate(
		remoteAdUsers: LdapUser[],
		localLdapIds: string[],
	): Array<[string, User]> {
		return remoteAdUsers
			.filter((adUser) => !localLdapIds.includes(adUser[this.config.ldapIdAttribute] as string))
			.map((adUser) => mapLdapUserToDbUser(adUser, this.config, true));
	}

	/** Get users in LDAP that are already in the database */
	private getUsersToUpdate(
		remoteAdUsers: LdapUser[],
		localLdapIds: string[],
	): Array<[string, User]> {
		return remoteAdUsers
			.filter((adUser) => localLdapIds.includes(adUser[this.config.ldapIdAttribute] as string))
			.map((adUser) => mapLdapUserToDbUser(adUser, this.config));
	}

	/** Get users that are in the database but not in the LDAP server */
	private getUsersToDisable(remoteAdUsers: LdapUser[], localLdapIds: string[]): string[] {
		const remoteAdUserIds = remoteAdUsers.map((adUser) => adUser[this.config.ldapIdAttribute]);
		return localLdapIds.filter((user) => !remoteAdUserIds.includes(user));
	}

	async handleLdapLogin(loginId: string, password: string): Promise<User | undefined> {
		if (!isLdapEnabled()) return undefined;

		if (!this.config.loginEnabled) return undefined;

		const { loginIdAttribute, userFilter } = this.config;

		const ldapUser = await this.findAndAuthenticateLdapUser(
			loginId,
			password,
			loginIdAttribute,
			userFilter,
		);

		if (!ldapUser) return undefined;

		const [ldapId, ldapAttributesValues] = mapLdapAttributesToUser(ldapUser, this.config);

		const { email: emailAttributeValue } = ldapAttributesValues;

		if (!ldapId || !emailAttributeValue) return undefined;

		const ldapAuthIdentity = await getAuthIdentityByLdapId(ldapId);
		if (!ldapAuthIdentity) {
			const emailUser = await getUserByEmail(emailAttributeValue);

			// check if there is an email user with the same email as the authenticated LDAP user trying to log-in
			if (emailUser && emailUser.email === emailAttributeValue) {
				const identity = await createLdapAuthIdentity(emailUser, ldapId);
				await updateLdapUserOnLocalDb(identity, ldapAttributesValues);
			} else {
				const user = await createLdapUserOnLocalDb(ldapAttributesValues, ldapId);
				Container.get(EventService).emit('user-signed-up', {
					user,
					userType: 'ldap',
					wasDisabledLdapUser: false,
				});
				return user;
			}
		} else {
			if (ldapAuthIdentity.user) {
				if (ldapAuthIdentity.user.disabled) return undefined;
				await updateLdapUserOnLocalDb(ldapAuthIdentity, ldapAttributesValues);
			}
		}

		// Retrieve the user again as user's data might have been updated
		return (await getUserByLdapId(ldapId)) ?? undefined;
	}
}
