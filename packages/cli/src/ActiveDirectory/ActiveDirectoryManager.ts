/* eslint-disable import/no-cycle */

import { ActiveDirectoryService } from './ActiveDirectoryService';
import { ActiveDirectorySync } from './ActiveDirectorySync';
import type { ActiveDirectoryConfig } from './types';

export class ActiveDirectoryManager {
	private static activeDirectory: {
		service: ActiveDirectoryService;
		sync: ActiveDirectorySync;
	};

	private static initialized: boolean;

	static getInstance(): {
		service: ActiveDirectoryService;
		sync: ActiveDirectorySync;
	} {
		if (!this.initialized) {
			throw new Error('Active Directory Service has not been initialized');
		}
		return this.activeDirectory;
	}

	static init(config: ActiveDirectoryConfig): void {
		this.activeDirectory = {
			service: new ActiveDirectoryService(),
			sync: new ActiveDirectorySync(),
		};
		this.activeDirectory.service.config = config;
		this.activeDirectory.sync.config = config;
		this.activeDirectory.sync.activeDirectoryService = this.activeDirectory.service;
		this.initialized = true;
	}

	static config(config: ActiveDirectoryConfig): void {
		this.activeDirectory.service.config = config;
		this.activeDirectory.sync.config = config;
	}
}
