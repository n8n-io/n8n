/* eslint-disable import/no-cycle */
/* eslint-disable no-underscore-dangle */
import type { Entry } from 'ldapts';
import { IDataObject, LoggerProxy as Logger } from 'n8n-workflow';
import { LdapService } from './LdapService';
import type { LdapConfig } from './types';
import { LDAP_LOG_PREPEND_MESSAGE, RunningMode, SyncStatus } from './constants';
import {
	addConfigFilter,
	getLdapUsers,
	getAdUserRole,
	mapLdapUserToDbUser,
	processUsers,
	saveLdapSyncronization,
} from './helpers';
import type { User } from '../databases/entities/User';
import type { Role } from '../databases/entities/Role';
import { LdapSyncHistory as ADSync } from '../databases/entities/LdapSyncHistory';

export class LdapSync {
	private intervalId: NodeJS.Timeout | undefined = undefined;

	private _config: LdapConfig;

	private _ldapService: LdapService;

	set config(config: LdapConfig) {
		this._config = config;
		// If user disable syncronization in the UI
		if (this.intervalId && !this._config.syncronization.enabled) {
			this.stop();
			// will only run the instance crashes and it starts again
		} else if (!this.intervalId && this._config.syncronization.enabled) {
			this.scheduleRun();
			// If syncronization scheduled and internval got updated in the UI
		} else if (this.intervalId && this._config.syncronization.enabled) {
			this.stop();
			this.scheduleRun();
		}
	}

	set ldapService(service: LdapService) {
		this._ldapService = service;
	}

	scheduleRun(): void {
		Logger.info(
			`${LDAP_LOG_PREPEND_MESSAGE} Scheduling a syncronization run in ${this._config.syncronization.interval} minutes`,
		);
		if (!this._config.syncronization.interval) {
			throw new Error('Interval variable has to be defined');
		}
		this.intervalId = setInterval(async () => {
			await this.run(RunningMode.LIVE);
		}, this._config.syncronization.interval * 60000);
	}

	async run(mode: RunningMode): Promise<void> {
		Logger.info(`${LDAP_LOG_PREPEND_MESSAGE} Starting a syncronization run in ${mode} mode`);

		//	`(&(${this._config.attributeMapping.loginId}=*)(!(mail=teresa.zeron1@gmail.com)))`
		const adUsers = await this._ldapService.searchWithAdminBinding(
			addConfigFilter(`(${this._config.attributeMapping.loginId}=*)`, this._config.filter.user),
		);

		const startedAt = new Date();

		const localAdUsers = await getLdapUsers();

		const role = await getAdUserRole();

		const { usersToCreate, usersToUpdate, usersToDisable } = this.getUsersToProcess(
			adUsers,
			localAdUsers,
			role,
		);

		const endedAt = new Date();
		let status = SyncStatus.SUCCESS;
		let errorMessage = '';

		try {
			if (mode === RunningMode.LIVE) {
				await processUsers(usersToCreate, usersToUpdate, usersToDisable);
			}
		} catch (exception) {
			const error = exception as IDataObject;
			status = SyncStatus.ERROR;
			errorMessage = error?.message as string;
		}

		const syncronization = new ADSync();
		Object.assign(syncronization, {
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

		await saveLdapSyncronization(syncronization);
	}

	stop(): void {
		clearInterval(this.intervalId);
		this.intervalId = undefined;
	}

	private getUsersToProcess(
		adUsers: Entry[],
		localAdUsers: string[],
		role: Role,
	): {
		usersToCreate: User[];
		usersToUpdate: User[];
		usersToDisable: string[];
	} {
		return {
			usersToCreate: this.getUsersToCreate(adUsers, localAdUsers, role),
			usersToUpdate: this.getUsersToUpdate(adUsers, localAdUsers),
			usersToDisable: this.getUsersToDisable(adUsers, localAdUsers),
		};
	}

	/**
	 * Get users in Active Directory that
	 * are not in the n8n DB
	 * @param  {Entry[]} adUsers
	 * @param  {string[]} localAdUsers
	 * @returns Array
	 */
	private getUsersToCreate(adUsers: Entry[], localAdUsers: string[], role: Role): User[] {
		return adUsers
			.filter(
				(user) => !localAdUsers.includes(user[this._config.attributeMapping.ldapId] as string),
			)
			.map((user: Entry) => mapLdapUserToDbUser(user, this._config.attributeMapping, role));
	}

	/**
	 * Get users in Active Directory that
	 * are in the n8n DB
	 * @param  {Entry[]} adUsers
	 * @param  {string[]} localAdUsers
	 * @returns Array
	 */
	private getUsersToUpdate(adUsers: Entry[], localAdUsers: string[]) {
		return adUsers
			.filter((user) => localAdUsers.includes(user[this._config.attributeMapping.ldapId] as string))
			.map((user: Entry) => mapLdapUserToDbUser(user, this._config.attributeMapping));
	}

	/**
	 * Get users that are in the local DB
	 * but no in Active Directory
	 * @param  {Entry[]} adUsers
	 * @param  {string[]} localAdUsers
	 * @retuens Array
	 */
	private getUsersToDisable(adUsers: Entry[], localAdUsers: string[]): string[] {
		const filteredAdUsers = adUsers.map((user) => user[this._config.attributeMapping.ldapId]);
		return localAdUsers.filter((user) => !filteredAdUsers.includes(user));
	}
}
