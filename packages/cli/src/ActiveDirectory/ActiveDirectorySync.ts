/* eslint-disable import/no-cycle */
/* eslint-disable no-underscore-dangle */
import type { Entry } from 'ldapts';
import { LoggerProxy as Logger } from 'n8n-workflow';
import { ActiveDirectoryService } from './ActiveDirectoryService';
import type { ActiveDirectoryConfig } from './types';
import { AD_LOG_PREPEND_MESSAGE, RunningMode } from './constants';
import {
	getActiveDirectoryUsersInLocalDb,
	getAdUserRole,
	mapToLocalDbUser,
	processUsers,
} from './helpers';
import type { User } from '../databases/entities/User';
import type { Role } from '../databases/entities/Role';
import chalk from 'chalk';

export class ActiveDirectorySync {
	private intervalId: NodeJS.Timeout | undefined = undefined;

	private _config: ActiveDirectoryConfig;

	private _activeDirectoryService: ActiveDirectoryService;

	set config(config: ActiveDirectoryConfig) {
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

	set activeDirectoryService(service: ActiveDirectoryService) {
		this._activeDirectoryService = service;
	}

	scheduleRun(): void {
		Logger.info(
			`${AD_LOG_PREPEND_MESSAGE} Scheduling a syncronization run in ${this._config.syncronization.interval} minutes`,
		);
		if (!this._config.syncronization.interval) {
			throw new Error('Interval variable has to be defined');
		}
		this.intervalId = setInterval(async () => {
			await this.run(RunningMode.LIVE);
		}, this._config.syncronization.interval * 60000);
	}

	async run(mode: RunningMode): Promise<void> {
		Logger.info(`${AD_LOG_PREPEND_MESSAGE} Starting a syncronization run in ${mode} mode`);

		const adUsers = await this._activeDirectoryService.searchWithAdminBinding(
			`(&(${this._config.attributeMapping.loginId}=*)(!(mail=teresa.zeron1@gmail.com)))`,
		);

		const startedAt = new Date().getTime();

		const localAdUsers = await getActiveDirectoryUsersInLocalDb();

		const role = await getAdUserRole();

		const { usersToCreate, usersToUpdate, usersToDisable } = this.getUsersToProcess(
			adUsers,
			localAdUsers,
			role,
		);

		const endedAt = new Date().getTime();

		console.log('se esta llamando');
		Logger.debug(chalk.red('TESTING'));

		// // @ts-ignore
		// console.log('AD USERS');
		// console.log(adUsers.map((user) => user.mail));
		// console.log(adUsers);

		// console.log('LOcal USERS');
		// console.log(localAdUsers);

		// console.log('To Create USERS');
		// console.log(usersToCreate.map((user) => user.email));
		// console.log('To Update USERS');
		// console.log(usersToUpdate.map((user) => user.email));

		try {
			if (mode === RunningMode.LIVE) {
				await processUsers(usersToCreate, usersToUpdate, usersToDisable);
			}
			// save to database;
		} catch (error) {
			console.log(error);
		}

		// console.log(localAdUsers);

		// if (type === RunningMode.LIVE) {
		// 	console.log('live');
		// } else {
		// 	console.log('dry');
		// }
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
				(user) => !localAdUsers.includes(user[this._config.attributeMapping.username] as string),
			)
			.map((user: Entry) => mapToLocalDbUser(user, this._config.attributeMapping, role));
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
			.filter((user) =>
				localAdUsers.includes(user[this._config.attributeMapping.username] as string),
			)
			.map((user: Entry) => mapToLocalDbUser(user, this._config.attributeMapping));
	}

	/**
	 * Get users that are in the local DB
	 * but no in Active Directory
	 * @param  {Entry[]} adUsers
	 * @param  {string[]} localAdUsers
	 * @retuens Array
	 */
	private getUsersToDisable(adUsers: Entry[], localAdUsers: string[]): string[] {
		const filteredAdUsers = adUsers.map((user) => user[this._config.attributeMapping.username]);
		return localAdUsers.filter((user) => !filteredAdUsers.includes(user));
	}
}
