/* eslint-disable no-underscore-dangle */
import { Client, Entry } from 'ldapts';
// eslint-disable-next-line import/no-cycle
import { IActiveDirectoryFeatureConfig } from '../Interfaces';

export class ActiveDirectoryService {
	private client: Client | undefined;

	private _config: IActiveDirectoryFeatureConfig;

	set config(config: IActiveDirectoryFeatureConfig) {
		this._config = config;
		this.client = undefined;
	}

	private async getClient() {
		if (this._config === undefined) {
			throw new Error('Service cannot be used without setting the property config');
		}
		if (this.client === undefined) {
			this.client = new Client({
				url: this._config.data.connection.url,
			});
		}
	}

	private async bindAdmin(): Promise<void> {
		await this.getClient();
		if (this.client) {
			await this.client.bind(
				this._config.data.binding.adminDn,
				this._config.data.binding.adminPassword,
			);
		}
	}

	async searchWithAdminBinding(filter: string): Promise<Entry[]> {
		await this.bindAdmin();
		if (this.client) {
			const { searchEntries } = await this.client.search(this._config.data.binding.baseDn, {
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
