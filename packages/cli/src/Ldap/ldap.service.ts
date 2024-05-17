import { Service } from 'typedi';
import { QueryFailedError } from '@n8n/typeorm';
import type { Entry as LdapUser, ClientOptions } from 'ldapts';
import { Client } from 'ldapts';
import type { ConnectionOptions } from 'tls';
import { ApplicationError, jsonParse } from 'n8n-workflow';
import { Cipher } from 'n8n-core';

import config from '@/config';
import type { User } from '@db/entities/User';
import type { RunningMode, SyncStatus } from '@db/entities/AuthProviderSyncHistory';
import { SettingsRepository } from '@db/repositories/settings.repository';
import { InternalHooks } from '@/InternalHooks';
import { Logger } from '@/Logger';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import {
	getCurrentAuthenticationMethod,
	isEmailCurrentAuthenticationMethod,
	isLdapCurrentAuthenticationMethod,
	setCurrentAuthenticationMethod,
} from '@/sso/ssoHelpers';

import type { LdapConfig } from './types';
import {
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
} from './helpers';
import {
	BINARY_AD_ATTRIBUTES,
	LDAP_FEATURE_NAME,
	LDAP_LOGIN_ENABLED,
	LDAP_LOGIN_LABEL,
} from './constants';

@Service()
export class LdapService {
	private client: Client | undefined;

	private syncTimer: NodeJS.Timeout | undefined = undefined;

	config: LdapConfig;

	constructor(
		private readonly logger: Logger,
		private readonly internalHooks: InternalHooks,
		private readonly settingsRepository: SettingsRepository,
		private readonly cipher: Cipher,
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
			throw new ApplicationError(message);
		}

		if (ldapConfig.loginEnabled && getCurrentAuthenticationMethod() === 'saml') {
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
		config.set(LDAP_LOGIN_LABEL, ldapConfig.loginLabel);
	}

	/** Set the LDAP login enabled to the configuration object */
	private async setLdapLoginEnabled(enabled: boolean): Promise<void> {
		if (isEmailCurrentAuthenticationMethod() || isLdapCurrentAuthenticationMethod()) {
			if (enabled) {
				config.set(LDAP_LOGIN_ENABLED, true);
				await setCurrentAuthenticationMethod('ldap');
			} else if (!enabled) {
				config.set(LDAP_LOGIN_ENABLED, false);
				await setCurrentAuthenticationMethod('email');
			}
		} else {
			throw new InternalServerError(
				`Cannot switch LDAP login enabled state when an authentication method other than email or ldap is active (current: ${getCurrentAuthenticationMethod()})`,
			);
		}
	}

	/**
	 * Get new/existing LDAP client,
	 * depending on whether the credentials
	 * were updated or not
	 */
	private async getClient() {
		if (this.config === undefined) {
			throw new ApplicationError('Service cannot be used without setting the property config');
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
				void this.internalHooks.onLdapLoginSyncFailed({
					error: e.message,
				});
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
			throw new ApplicationError('Interval variable has to be defined');
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

		this.logger.debug('LDAP - Users to process', {
			created: usersToCreate.length,
			updated: usersToUpdate.length,
			disabled: usersToDisable.length,
		});

		const endedAt = new Date();
		let status: SyncStatus = 'success';
		let errorMessage = '';

		try {
			if (mode === 'live') {
				await processUsers(usersToCreate, usersToUpdate, usersToDisable);
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
			created: usersToCreate.length,
			updated: usersToUpdate.length,
			disabled: usersToDisable.length,
			scanned: adUsers.length,
			runMode: mode,
			status,
			error: errorMessage,
		});

		void this.internalHooks.onLdapSyncFinished({
			type: !this.syncTimer ? 'scheduled' : `manual_${mode}`,
			succeeded: true,
			users_synced: usersToCreate.length + usersToUpdate.length + usersToDisable.length,
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
}
