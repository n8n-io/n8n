import pick from 'lodash/pick';
import { Authorized, Get, Post, Put, RestController, RequireGlobalScope } from '@/decorators';
import { InternalHooks } from '@/InternalHooks';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { NON_SENSIBLE_LDAP_CONFIG_PROPERTIES } from './constants';
import { getLdapSynchronizations } from './helpers';
import { LdapConfiguration } from './types';
import { LdapService } from './ldap.service';

@Authorized()
@RestController('/ldap')
export class LdapController {
	constructor(
		private readonly internalHooks: InternalHooks,
		private readonly ldapService: LdapService,
	) {}

	@Get('/config')
	@RequireGlobalScope('ldap:manage')
	async getConfig() {
		return await this.ldapService.loadConfig();
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
			await this.ldapService.updateConfig(req.body);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}

		const data = await this.ldapService.loadConfig();

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
		return await getLdapSynchronizations(parseInt(page, 10), parseInt(perPage, 10));
	}

	@Post('/sync')
	@RequireGlobalScope('ldap:sync')
	async syncLdap(req: LdapConfiguration.Sync) {
		try {
			await this.ldapService.runSync(req.body.type);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}
}
