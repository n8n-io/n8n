/* eslint-disable import/no-cycle */
/* eslint-disable no-underscore-dangle */
import { Entry } from 'ldapts';
import { ActiveDirectoryService } from './ActiveDirectoryService';
import type { ActiveDirectoryConfig } from './types';
import { RunningMode } from './constants';
import {
	getActiveDirectoryUserUsernames,
	getAdUserRole,
	mapToLocalDbUser,
	processUsers,
} from './helpers';
import { User } from '../databases/entities/User';
import { Role } from '../databases/entities/Role';

export class ActiveDirectorySync {
	private intervalId: NodeJS.Timeout | undefined = undefined;

	private _config: ActiveDirectoryConfig;

	private _activeDirectoryService: ActiveDirectoryService;

	// private running: boolean = false;

	set config(config: ActiveDirectoryConfig) {
		this._config = config;
		if (this.intervalId && !this._config.syncronization.enabled) {
			this.stop();
			// will only run the instance crashes and it starts again
		} else if (!this.intervalId && this._config.syncronization.enabled) {
			this.scheduleRun();
		}
	}

	set activeDirectoryService(service: ActiveDirectoryService) {
		this._activeDirectoryService = service;
	}

	scheduleRun(): void {
		if (!this._config.syncronization.interval) {
			throw new Error('Interval variable has to be defined');
		}
		this.intervalId = setInterval(async () => {
			await this.run(RunningMode.LIVE);
		}, this._config.syncronization.interval * 60000);
	}

	async run(mode: RunningMode): Promise<void> {
		console.log('running in mode ', mode);
		const adUsers = await this._activeDirectoryService.searchWithAdminBinding(
			`(&(${this._config.attributeMapping.loginId}=*)(!(mail=teresa.zeron1@gmail.com)))`,
		);

		const localAdUsers = await getActiveDirectoryUserUsernames();

		const role = await getAdUserRole();

		const toCreateUsers = this.getToCreateUsers(adUsers, localAdUsers, role);

		const toUpdateUsers = this.getToUpdateUsers(adUsers, localAdUsers);

		// @ts-ignore
		console.log('AD USERS');
		console.log(adUsers.map((user) => user.mail));

		console.log('LOcal USERS');
		console.log(localAdUsers);

		console.log('To Create USERS');
		console.log(toCreateUsers.map((user) => user.email));
		console.log('To Update USERS');
		console.log(toUpdateUsers.map((user) => user.email));

		try {
			if (mode === RunningMode.DRY) {
				await processUsers(toCreateUsers, toUpdateUsers);
			}
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

	/**
	 * Get users in Active Directory that
	 * are not in the n8n DB
	 * @param  {Entry[]} adUsers
	 * @param  {string[]} localAdUsers
	 * @returns Array
	 */
	private getToCreateUsers(adUsers: Entry[], localAdUsers: string[], role: Role): User[] {
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
	private getToUpdateUsers(adUsers: Entry[], localAdUsers: string[]) {
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
	private getToInactiveUsers(adUsers: Entry[], localAdUsers: string[]): string[] {
		const filteredAdUsers = adUsers.map((user) => user[this._config.attributeMapping.username]);
		return localAdUsers.filter((user) => !filteredAdUsers.includes(user));
	}
}
