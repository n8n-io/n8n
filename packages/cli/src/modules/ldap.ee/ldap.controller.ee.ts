import { EventService } from '@n8n/backend-services';
import { Get, Post, Put, RestController, GlobalScope, Licensed } from '@n8n/decorators';
import pick from 'lodash/pick';

import { BadRequestError } from '@n8n/errors';

import { NON_SENSIBLE_LDAP_CONFIG_PROPERTIES } from './constants';
import { getLdapSynchronizations } from './helpers.ee';
import { LdapService } from './ldap.service.ee';
import { redactLdapConfig } from './redact-ldap-config';
import { LdapConfiguration } from './types';

@RestController('/ldap')
export class LdapController {
	constructor(
		private readonly ldapService: LdapService,
		private readonly eventService: EventService,
	) {}

	@Get('/config')
	@Licensed('feat:ldap')
	@GlobalScope('ldap:manage')
	async getConfig() {
		const ldapConfig = await this.ldapService.loadConfig();
		return redactLdapConfig(ldapConfig);
	}

	@Post('/test-connection')
	@Licensed('feat:ldap')
	@GlobalScope('ldap:manage')
	async testConnection() {
		try {
			await this.ldapService.testConnection();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Put('/config')
	@Licensed('feat:ldap')
	@GlobalScope('ldap:manage')
	async updateConfig(req: LdapConfiguration.Update) {
		try {
			await this.ldapService.updateConfig(req.body);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}

		const data = await this.ldapService.loadConfig();

		this.eventService.emit('ldap-settings-updated', {
			userId: req.user.id,
			...pick(data, NON_SENSIBLE_LDAP_CONFIG_PROPERTIES),
		});

		return redactLdapConfig(data);
	}

	@Get('/sync')
	@Licensed('feat:ldap')
	@GlobalScope('ldap:sync')
	async getLdapSync(req: LdapConfiguration.GetSync) {
		const { page = '0', perPage = '20' } = req.query;
		return await getLdapSynchronizations(parseInt(page, 10), parseInt(perPage, 10));
	}

	@Post('/sync')
	@Licensed('feat:ldap')
	@GlobalScope('ldap:sync')
	async syncLdap(req: LdapConfiguration.Sync) {
		try {
			await this.ldapService.runSync(req.body.type);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}
}
