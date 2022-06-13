/* eslint-disable no-underscore-dangle */
import { Client, Entry } from 'ldapts';

interface IConfig {
	url: string;
	adminDn: string;
	adminPassword: string;
	baseDn: string;
}

export class ActiveDirectoryService {
	private client: Client | undefined;

	private _config: IConfig;

	// private url = config.getEnv('activeDirectory.connection.url');

	// private adminDn = config.getEnv('activeDirectory.binding.adminDn');

	// private adminPassword = config.getEnv('activeDirectory.binding.adminDn');

	// private baseDn = config.getEnv('activeDirectory.binding.adminPassword');

	// private attributesMapping = {
	// 	email: config.getEnv('activeDirectory.attributeMapping.email'),
	// 	firstName: config.getEnv('activeDirectory.attributeMapping.firstName'),
	// 	lastName: config.getEnv('activeDirectory.attributeMapping.lastName'),
	// };

	set config(config: IConfig) {
		this._config = config;
		this.client = undefined;
	}

	private async getClient() {
		if (this.client === undefined) {
			this.client = new Client({
				url: this._config.url,
			});
		}
	}

	private async bindAdmin(): Promise<void> {
		await this.getClient();
		if (this.client) {
			await this.client.bind(this._config.adminDn, this._config.adminPassword);
		}
	}

	async searchWithAdminBinding(filter: string): Promise<Entry[]> {
		await this.bindAdmin();
		if (this.client) {
			const { searchEntries } = await this.client.search(this._config.baseDn, {
				filter,
			});
			await this.client.unbind();
			return searchEntries;
		}
		return Promise.resolve([]);
	}

	async validUser(dn: string, password: string): Promise<void> {
		if (this.client) {
			await this.client.bind(dn, password);
			await this.client.unbind();
		}
	}
}
