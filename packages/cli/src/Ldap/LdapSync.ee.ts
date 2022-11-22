/* eslint-disable no-underscore-dangle */
import { Entry } from 'ldapts';
import { LoggerProxy as Logger } from 'n8n-workflow';
import { LdapService } from './LdapService.ee';
import type { LdapConfig } from './types';
import { RunningMode, SyncStatus } from './constants';
import {
	getLdapUsers,
	getLdapUserRole,
	mapLdapUserToDbUser,
	processUsers,
	saveLdapSyncronization,
	createFilter,
	resolveBinaryAttributes,
} from './helpers';
import type { User } from '@db/entities/User';
import type { Role } from '@db/entities/Role';
import { LdapSyncHistory as ADSync } from '@db/entities/LdapSyncHistory';
import { QueryFailedError } from 'typeorm/error/QueryFailedError';

export class LdapSync {
	private intervalId: NodeJS.Timeout | undefined = undefined;

	private _config: LdapConfig;

	private _ldapService: LdapService;

	/**
	 * Updates the LDAP configuration
	 * @param  {LdapConfig} config
	 */
	set config(config: LdapConfig) {
		this._config = config;
		// If user disabled syncronization in the UI and there a job schedule,
		// stop it
		if (this.intervalId && !this._config.syncronizationEnabled) {
			this.stop();
			// If instance crashed with a job scheduled, once the server starts
			// again, reschedule it.
		} else if (!this.intervalId && this._config.syncronizationEnabled) {
			this.scheduleRun();
			// If job scheduled and the run interval got updated in the UI
			// stop the current one and schedule a new one with the new internal
		} else if (this.intervalId && this._config.syncronizationEnabled) {
			this.stop();
			this.scheduleRun();
		}
	}

	/**
	 * Set the LDAP service instance
	 * @param  {LdapService} service
	 */
	set ldapService(service: LdapService) {
		this._ldapService = service;
	}

	/**
	 * Schedule a syncronization job based
	 * on the interval set in the LDAP config
	 * @returns void
	 */
	scheduleRun(): void {
		if (!this._config.syncronizationInterval) {
			throw new Error('Interval variable has to be defined');
		}
		this.intervalId = setInterval(async () => {
			await this.run(RunningMode.LIVE);
		}, this._config.syncronizationInterval * 60000);
	}

	/**
	 * Run the syncronization job.
	 * If the job runs in "live" mode,
	 * changes to LDAP users are persisted
	 * in the database, else the users are
	 * not modified
	 * @param  {RunningMode} mode
	 * @returns Promise
	 */
	async run(mode: RunningMode): Promise<void> {
		Logger.debug(`LDAP - Starting a syncronization run in ${mode} mode`);

		let adUsers: Entry[] = [];

		try {
			adUsers = await this._ldapService.searchWithAdminBinding(
				createFilter(`(${this._config.loginIdAttribute}=*)`, this._config.userFilter),
			);

			Logger.debug(`LDAP - Users return by the query`, {
				users: adUsers,
			});

			resolveBinaryAttributes(adUsers);
		} catch (e) {
			if (e instanceof Error) {
				Logger.error(`LDAP - ${e.message}`);
				throw e;
			}
		}

		const startedAt = new Date();

		const localAdUsers = await getLdapUsers();

		const role = await getLdapUserRole();

		const { usersToCreate, usersToUpdate, usersToDisable } = this.getUsersToProcess(
			adUsers,
			localAdUsers,
			role,
		);

		Logger.debug(`LDAP - Users proccesed`, {
			created: usersToCreate.length,
			updated: usersToUpdate.length,
			disabled: usersToDisable.length,
		});

		const endedAt = new Date();
		let status = SyncStatus.SUCCESS;
		let errorMessage = '';

		try {
			if (mode === RunningMode.LIVE) {
				await processUsers(usersToCreate, usersToUpdate, usersToDisable);
			}
		} catch (error) {
			if (error instanceof QueryFailedError) {
				status = SyncStatus.ERROR;
				errorMessage = `${error.message}`;
			}
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

		Logger.debug(`LDAP - Syncronization finished successfully`);
	}

	/**
	 * Stop the current job scheduled,
	 * if any
	 * @returns void
	 */
	stop(): void {
		clearInterval(this.intervalId);
		this.intervalId = undefined;
	}

	/**
	 * Get all the user that will be
	 * changed (created, updated, disabled),
	 * in the database
	 * @param  {Entry[]} adUsers
	 * @param  {string[]} localAdUsers
	 * @param  {Role} role
	 */
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
	 * Get users in LDAP that
	 * are not in the database
	 * @param  {Entry[]} adUsers
	 * @param  {string[]} localAdUsers
	 * @returns Array
	 */
	private getUsersToCreate(adUsers: Entry[], localAdUsers: string[], role: Role): User[] {
		return adUsers
			.filter((user) => !localAdUsers.includes(user[this._config.ldapIdAttribute] as string))
			.map((user: Entry) => mapLdapUserToDbUser(user, this._config, role));
	}

	/**
	 * Get users in LDAP that
	 * are in the n8n database
	 * @param  {Entry[]} adUsers
	 * @param  {string[]} localAdUsers
	 * @returns Array
	 */
	private getUsersToUpdate(adUsers: Entry[], localAdUsers: string[]) {
		return adUsers
			.filter((user) => localAdUsers.includes(user[this._config.ldapIdAttribute] as string))
			.map((user: Entry) => mapLdapUserToDbUser(user, this._config));
	}

	/**
	 * Get users that are in the database
	 * but no in the LDAP server
	 * @param  {Entry[]} adUsers
	 * @param  {string[]} localAdUsers
	 * @retuens Array
	 */
	private getUsersToDisable(adUsers: Entry[], localAdUsers: string[]): string[] {
		const filteredAdUsers = adUsers.map((user) => user[this._config.ldapIdAttribute]);
		return localAdUsers.filter((user) => !filteredAdUsers.includes(user));
	}
}
