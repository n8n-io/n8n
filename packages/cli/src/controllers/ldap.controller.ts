import pick from 'lodash/pick';
import { Authorized, Get, Post, Put, RestController, RequireGlobalScope } from '@/decorators';
import {
	deleteAllLdapIdentities,
	getLdapConfig,
	getLdapSynchronizations,
	getLdapUsers,
	setGlobalLdapConfigVariables,
	validateLdapConfigurationSchema,
} from '@/Ldap/helpers';
import { LdapManager } from '@/Ldap/LdapManager.ee';
import type { LdapService } from '@/Ldap/LdapService.ee';
import type { LdapSync } from '@/Ldap/LdapSync.ee';
import type { LdapConfig } from '@/Ldap/types';
import { LdapConfiguration } from '@/Ldap/types';
import { LDAP_FEATURE_NAME, NON_SENSIBLE_LDAP_CONFIG_PROPERTIES } from '@/Ldap/constants';
import { InternalHooks } from '@/InternalHooks';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ApplicationError } from 'n8n-workflow';
import { getCurrentAuthenticationMethod } from '@/sso/ssoHelpers';
import Container from 'typedi';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { Cipher } from 'n8n-core';

@Authorized()
@RestController('/ldap')
export class LdapController {
	private ldapService: LdapService;

	private ldapSync: LdapSync;

	constructor(private readonly internalHooks: InternalHooks) {
		const { service, sync } = LdapManager.getInstance();
		this.ldapService = service;
		this.ldapSync = sync;
	}

	@Get('/config')
	@RequireGlobalScope('ldap:manage')
	async getConfig() {
		return getLdapConfig();
	}

	@Post('/test-connection')
	@RequireGlobalScope('ldap:manage')
	async testConnection() {
		try {
			await this.ldapService.testConnection();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Put('/config')
	@RequireGlobalScope('ldap:manage')
	async updateConfig(req: LdapConfiguration.Update) {
		try {
			await this.updateLdapConfig(req.body);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}

		const data = await getLdapConfig();

		void this.internalHooks.onUserUpdatedLdapSettings({
			user_id: req.user.id,
			...pick(data, NON_SENSIBLE_LDAP_CONFIG_PROPERTIES),
		});

		return data;
	}

	@Get('/sync')
	@RequireGlobalScope('ldap:sync')
	async getLdapSync(req: LdapConfiguration.GetSync) {
		const { page = '0', perPage = '20' } = req.query;
		return getLdapSynchronizations(parseInt(page, 10), parseInt(perPage, 10));
	}

	@Post('/sync')
	@RequireGlobalScope('ldap:sync')
	async syncLdap(req: LdapConfiguration.Sync) {
		try {
			await this.ldapSync.run(req.body.type);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	private updateLdapConfig = async (ldapConfig: LdapConfig): Promise<void> => {
		const { valid, message } = validateLdapConfigurationSchema(ldapConfig);

		if (!valid) {
			throw new ApplicationError(message);
		}

		if (ldapConfig.loginEnabled && getCurrentAuthenticationMethod() === 'saml') {
			throw new BadRequestError('LDAP cannot be enabled if SSO in enabled');
		}

		LdapManager.updateConfig({ ...ldapConfig });

		ldapConfig.bindingAdminPassword = Container.get(Cipher).encrypt(
			ldapConfig.bindingAdminPassword,
		);

		if (!ldapConfig.loginEnabled) {
			ldapConfig.synchronizationEnabled = false;
			const ldapUsers = await getLdapUsers();
			if (ldapUsers.length) {
				await deleteAllLdapIdentities();
			}
		}

		await Container.get(SettingsRepository).update(
			{ key: LDAP_FEATURE_NAME },
			{ value: JSON.stringify(ldapConfig), loadOnStartup: true },
		);
		await setGlobalLdapConfigVariables(ldapConfig);
	};
}
