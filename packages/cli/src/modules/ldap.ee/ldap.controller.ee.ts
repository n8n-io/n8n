import type { LdapConfig } from '@n8n/constants';
import { Get, Post, Put, RestController, GlobalScope, Licensed } from '@n8n/decorators';
import pick from 'lodash/pick';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';

import { NON_SENSIBLE_LDAP_CONFIG_PROPERTIES } from './constants';
import { getLdapSynchronizations } from './helpers.ee';
import { LdapService } from './ldap.service.ee';
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
		return this.redactConfig(await this.ldapService.loadConfig());
	}

	/** Blank the bind password before returning the config over HTTP. */
	private redactConfig(config: LdapConfig): LdapConfig {
		return {
			...config,
			bindingAdminPassword: config.bindingAdminPassword ? CREDENTIAL_BLANKING_VALUE : '',
		};
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

		return this.redactConfig(data);
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
