/* eslint-disable no-underscore-dangle */
import { Client, Entry as LdapUser, ClientOptions } from 'ldapts';
import type { LdapConfig } from './types';
import { formatUrl, getMappingAttributes } from './helpers';
import { BINARY_AD_ATTRIBUTES } from './constants';
import { ConnectionOptions } from 'tls';

export class LdapService {
	private client: Client | undefined;

	private _config: LdapConfig;

	/**
	 * Set the LDAP configuration and expire the current client
	 */
	set config(config: LdapConfig) {
		this._config = config;
		this.client = undefined;
	}

	/**
	 * Get new/existing LDAP client,
	 * depending on whether the credentials
	 * were updated or not
	 */
	private async getClient() {
		if (this._config === undefined) {
			throw new Error('Service cannot be used without setting the property config');
		}
		if (this.client === undefined) {
			const url = formatUrl(
				this._config.connectionUrl,
				this._config.connectionPort,
				this._config.connectionSecurity,
			);
			const ldapOptions: ClientOptions = { url };
			const tlsOptions: ConnectionOptions = {};

			if (this._config.connectionSecurity !== 'none') {
				Object.assign(tlsOptions, {
					rejectUnauthorized: !this._config.allowUnauthorizedCerts,
				});
				if (this._config.connectionSecurity === 'tls') {
					ldapOptions.tlsOptions = tlsOptions;
				}
			}

			this.client = new Client(ldapOptions);
			if (this._config.connectionSecurity === 'startTls') {
				await this.client.startTLS(tlsOptions);
			}
		}
	}

	/**
	 * Attempt a binding with the admin credentials
	 */
	private async bindAdmin(): Promise<void> {
		await this.getClient();
		if (this.client) {
			await this.client.bind(this._config.bindingAdminDn, this._config.bindingAdminPassword);
		}
	}

	/**
	 * Search the LDAP server using the administrator binding
	 * (if any, else a anonymous binding will be attempted)
	 */
	async searchWithAdminBinding(filter: string): Promise<LdapUser[]> {
		await this.bindAdmin();
		if (this.client) {
			const { searchEntries } = await this.client.search(this._config.baseDn, {
				attributes: getMappingAttributes(this._config),
				explicitBufferAttributes: BINARY_AD_ATTRIBUTES,
				filter,
				timeLimit: this._config.searchTimeout,
				paged: { pageSize: this._config.searchPageSize },
				...(this._config.searchPageSize === 0 && { paged: true }),
			});

			await this.client.unbind();
			return searchEntries;
		}
		return Promise.resolve([]);
	}

	/**
	 * Attempt binding with the user's credentials
	 */
	async validUser(dn: string, password: string): Promise<void> {
		await this.getClient();
		if (this.client) {
			await this.client.bind(dn, password);
			await this.client.unbind();
		}
	}

	/**
	 * Attempt binding with the administrator credentials, to test the connection
	 */
	async testConnection(): Promise<void> {
		await this.bindAdmin();
	}
}
