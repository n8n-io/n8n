import pick from 'lodash.pick';
import { Authorized, Get, Post, Put, RestController } from '@/decorators';
import { getLdapConfig, getLdapSynchronizations, updateLdapConfig } from '@/Ldap/helpers';
import { LdapService } from '@/Ldap/LdapService.ee';
import { LdapSync } from '@/Ldap/LdapSync.ee';
import { LdapConfiguration } from '@/Ldap/types';
import { BadRequestError } from '@/ResponseHelper';
import { NON_SENSIBLE_LDAP_CONFIG_PROPERTIES } from '@/Ldap/constants';
import { InternalHooks } from '@/InternalHooks';

@Authorized(['global', 'owner'])
@RestController('/ldap')
export class LdapController {
	constructor(
		private ldapService: LdapService,
		private ldapSync: LdapSync,
		private internalHooks: InternalHooks,
	) {}

	@Get('/config')
	async getConfig() {
		return getLdapConfig();
	}

	@Post('/test-connection')
	async testConnection() {
		try {
			await this.ldapService.testConnection();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Put('/config')
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
	async getLdapSync(req: LdapConfiguration.GetSync) {
		const { page = '0', perPage = '20' } = req.query;
		return getLdapSynchronizations(parseInt(page, 10), parseInt(perPage, 10));
	}

	@Post('/sync')
	async syncLdap(req: LdapConfiguration.Sync) {
		try {
			await this.ldapSync.run(req.body.type);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}
}
