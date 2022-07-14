/* eslint-disable no-underscore-dangle */
import { ActiveDirectoryService } from './ActiveDirectoryService';
import type { ActiveDirectoryConfig } from './types';

export class ActiveDirectorySync {
	private intervalId: NodeJS.Timeout;

	private _config: ActiveDirectoryConfig;

	private _activeDirectoryService: ActiveDirectoryService;

	set config(config: ActiveDirectoryConfig) {
		this._config = config;
	}

	set activeDirectoryService(service: ActiveDirectoryService) {
		this._activeDirectoryService = service;
	}

	start() {
		// if (!this._config.seconds) {
		// 	throw new Error('Seconds variable has to be defined');
		// }
		// this.intervalId = setInterval(async () => {
		// 	await this.run();
		// }, this._config.seconds * 1000);
	}

	async run(): Promise<void> {
		console.log('1');
	}

	stop() {
		clearInterval(this.intervalId);
	}
}
