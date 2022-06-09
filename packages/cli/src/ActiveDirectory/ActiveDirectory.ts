import { Client } from 'ldapts';
import config from '../../config';

export interface ActiveDirectoryImplementation {
	verifyConnection: () => Promise<void>;
}

let activeDirectory: ActiveDirectory | undefined;

class ActiveDirectory implements ActiveDirectoryImplementation {
	client: Client;

	constructor() {
		this.client = new Client({
			url: config.getEnv('activeDirectory.connection.url'),
		});
	}

	async verifyConnection(): Promise<void> {
		await this.client.bind('PLAIN', 'ricardo123');
	}

	search() {}
}

export function getActiveDirectoryInstance(): ActiveDirectory {
	if (activeDirectory === undefined) {
		return new ActiveDirectory();
	}
	return activeDirectory;
}
