import pick from 'lodash/pick';
import { Authorized, Get, Post, Put, RestController, RequireGlobalScope } from '@/decorators';
import { getLdapConfig, getLdapSynchronizations, updateLdapConfig } from '@/Ldap/helpers';
import { LdapManager } from '@/Ldap/LdapManager.ee';
import type { LdapService } from '@/Ldap/LdapService.ee';
import type { LdapSync } from '@/Ldap/LdapSync.ee';
import { LdapConfiguration } from '@/Ldap/types';
import { NON_SENSIBLE_LDAP_CONFIG_PROPERTIES } from '@/Ldap/constants';
import { InternalHooks } from '@/InternalHooks';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

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
			await updateLdapConfig(req.body);
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
}
