import { ActiveDirectoryService } from './ActiveDirectoryService';

/* eslint-disable no-underscore-dangle */
let activeDirectorySync: ActiveDirectorySync | undefined;

interface ActiveDirectorySettings {
	seconds?: number | undefined;
}

class ActiveDirectorySync {
	private intervalId: NodeJS.Timeout;

	private _config: ActiveDirectorySettings = {};

	private _activeDirectoryService: ActiveDirectoryService;

	set config(config: ActiveDirectorySettings) {
		this._config = config;
	}

	set activeDirectoryService(service: ActiveDirectoryService) {
		this._activeDirectoryService = service;
	}

	start() {
		if (!this._config.seconds) {
			throw new Error('Seconds variable has to be defined');
		}
		this.intervalId = setInterval(async () => {
			await this.run();
		}, this._config.seconds * 1000);
	}

	async run(): Promise<void> {
		console.log('1');
	}

	stop() {
		clearInterval(this.intervalId);
	}
}

export function getActiveDirectorySyncInstance(): ActiveDirectorySync {
	if (activeDirectorySync === undefined) {
		return new ActiveDirectorySync();
	}
	return activeDirectorySync;
}
