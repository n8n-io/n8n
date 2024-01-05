import { ApplicationError } from 'n8n-workflow';
import { LdapService } from './LdapService.ee';
import { LdapSync } from './LdapSync.ee';
import type { LdapConfig } from './types';
import { getLdapConfig, isLdapEnabled, setGlobalLdapConfigVariables } from './helpers';
import Container from 'typedi';
import { Logger } from '@/Logger';
import { getCurrentAuthenticationMethod } from '@/sso/ssoHelpers';

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
			throw new ApplicationError('LDAP Manager has not been initialized');
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

	static handleLdapInit = async (): Promise<void> => {
		if (!isLdapEnabled()) return;

		const ldapConfig = await getLdapConfig();

		try {
			await setGlobalLdapConfigVariables(ldapConfig);
		} catch (error) {
			Container.get(Logger).warn(
				`Cannot set LDAP login enabled state when an authentication method other than email or ldap is active (current: ${getCurrentAuthenticationMethod()})`,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				error,
			);
		}

		// init LDAP manager with the current
		// configuration
		LdapManager.init(ldapConfig);
	};
}
