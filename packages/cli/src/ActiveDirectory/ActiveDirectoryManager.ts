/* eslint-disable import/no-cycle */

import { ActiveDirectoryService } from './ActiveDirectoryService';

export class ActiveDirectoryManager {
	private static activeDirectory: ActiveDirectoryService | undefined;

	static getInstance(): ActiveDirectoryService {
		if (!this.activeDirectory) {
			return new ActiveDirectoryService();
		}
		return this.activeDirectory;
	}

	static destroy(): void {
		this.activeDirectory = undefined;
	}
}
