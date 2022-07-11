/* eslint-disable import/no-cycle */

import { ActiveDirectoryService } from './ActiveDirectoryService';
import type { ActiveDirectoryConfig } from './types';

export class ActiveDirectoryManager {
	private static activeDirectory: ActiveDirectoryService | undefined;

	static getInstance(): ActiveDirectoryService {
		if (!this.activeDirectory) {
			throw new Error('Active Directory Service has not been initialized');
		}
		return this.activeDirectory;
	}

	static init(config: ActiveDirectoryConfig): void {
		this.activeDirectory = new ActiveDirectoryService();
		this.activeDirectory.config = config;
	}

	// static destroy(): void {
	// 	this.activeDirectory = undefined;
	// }
}
