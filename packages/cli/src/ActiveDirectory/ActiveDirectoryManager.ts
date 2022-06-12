/* eslint-disable import/no-cycle */

import { ActiveDirectory } from './ActiveDirectory';

export class ActiveDirectoryManager {
	private static activeDirectory: ActiveDirectory | null;

	static getInstance(): ActiveDirectory {
		if (!this.activeDirectory) {
			return new ActiveDirectory();
		}
		return this.activeDirectory;
	}

	static destroy(): void {
		this.activeDirectory = null;
	}
}
