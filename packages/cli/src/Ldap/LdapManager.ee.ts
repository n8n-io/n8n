import { LdapService } from './LdapService.ee';
import { LdapSync } from './LdapSync.ee';
import type { LdapConfig } from './types';

export class LdapManager {
	private static ldap: {
		service: LdapService;
		sync: LdapSync;
	};

	private static initialized: boolean;

	static getInstance(): {
		service: LdapService;
		sync: LdapSync;
	} {
		if (!this.initialized) {
			throw new Error('LDAP Manager has not been initialized');
		}
		return this.ldap;
	}

	static init(config: LdapConfig): void {
		this.ldap = {
			service: new LdapService(),
			sync: new LdapSync(),
		};
		this.ldap.service.config = config;
		this.ldap.sync.config = config;
		this.ldap.sync.ldapService = this.ldap.service;
		this.initialized = true;
	}

	static updateConfig(config: LdapConfig): void {
		this.ldap.service.config = config;
		this.ldap.sync.config = config;
	}
}
