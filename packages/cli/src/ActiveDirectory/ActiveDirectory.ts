import { Client, Entry } from 'ldapts';
import config from '../../config';

export interface ActiveDirectoryImplementation {
	verifyConnection: () => Promise<void>;
}

// let activeDirectory: ActiveDirectory | undefined;

export class ActiveDirectory {
	private client: Client;

	constructor() {
		this.client = new Client({
			url: config.getEnv('activeDirectory.connection.url'),
		});
	}

	private async bindAdmin(): Promise<void> {
		await this.client.bind(
			config.getEnv('activeDirectory.connection.adminDn'),
			config.getEnv('activeDirectory.connection.adminPassword'),
		);
	}

	async searchWithAdminBinding(filter: string): Promise<Entry[]> {
		await this.bindAdmin();
		const { searchEntries } = await this.client.search(
			config.getEnv('activeDirectory.connection.baseDn'),
			{
				filter,
			},
		);
		await this.client.unbind();
		return searchEntries;
	}

	async validUser(loginId: string, password: string): Promise<void> {
		await this.client.bind(loginId, password);
		await this.client.unbind();
	}
}

// export function getActiveDirectoryInstance(): ActiveDirectory {
// 	if (activeDirectory === undefined) {
// 		return new ActiveDirectory();
// 	}
// 	return activeDirectory;
// }
