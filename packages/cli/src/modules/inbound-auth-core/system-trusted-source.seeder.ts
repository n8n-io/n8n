import { Logger } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import type { TrustedSourceConfigInput } from '@n8n/inbound-auth';
import { InstanceSettings } from 'n8n-core';

import { TrustedSourceDbStore } from './trusted-source.store';

// Only the seeder uses these. Pipeline code must not compare a source id or name with them: the
// system source is a plain oauth2 source to every surface.
export const SYSTEM_TRUSTED_SOURCE_ID = 'n8n-internal';
export const SYSTEM_TRUSTED_SOURCE_NAME = 'n8n';
export const SYSTEM_TRUSTED_SOURCE_CONFIG = {
	version: 1,
	authentication: {
		type: 'oauth2',
		discovery: { mode: 'auto' },
		keys: { kind: 'local-keystore' },
		verification: { mode: 'jwt' },
		client: { kind: 'virtual' },
	},
	surfaces: { 'public-api': {}, 'instance-mcp': {}, trigger: {} },
	identity: {
		subject: 'n8n-user-id',
		claimMapping: { subject: 'sub', clientId: 'client_id', scopes: 'scope' },
		linkByEmail: 'off',
		provision: { human: 'off' },
		roleMapping: { mode: 'off', instanceRoleRules: [], projectRoleRules: [] },
	},
} satisfies TrustedSourceConfigInput;

/**
 * Seeds the trusted source for n8n's own OAuth server, with the instance base URL as its issuer.
 *
 * Every process seeds, not only the leader: a webhook process can serve requests before any main
 * has booted. The insert is idempotent, so concurrent seeders need no leader check.
 *
 * Only main moves the issuer of an existing row. Main serves the OAuth server and mints its
 * tokens, so its base URL is the issuer. A webhook or worker process can resolve a different base
 * URL, for example without `N8N_EDITOR_BASE_URL`, and must not move the issuer away from main's.
 */
@Service()
export class SystemTrustedSourceSeeder {
	constructor(
		private readonly store: TrustedSourceDbStore,
		private readonly urlService: UrlService,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('inbound-auth');
	}

	/** Never throws on a conflict: boot continues and tokens from the internal server fail closed. */
	async seed(): Promise<void> {
		const issuer = this.urlService.getInstanceBaseUrl();
		const outcome = await this.store.seedSystemSource({
			id: SYSTEM_TRUSTED_SOURCE_ID,
			name: SYSTEM_TRUSTED_SOURCE_NAME,
			issuer,
			config: SYSTEM_TRUSTED_SOURCE_CONFIG,
			updateIssuer: this.instanceSettings.instanceType === 'main',
		});
		const context = { id: SYSTEM_TRUSTED_SOURCE_ID, issuer };

		switch (outcome) {
			case 'inserted':
				this.logger.info('Seeded the system trusted source', context);
				break;
			case 'issuer-updated':
				this.logger.info('Moved the system trusted source to the instance base URL', context);
				break;
			case 'unchanged':
				this.logger.debug('System trusted source is up to date', context);
				break;
			case 'issuer-kept':
				this.logger.debug(
					'System trusted source names another issuer; only a main instance moves it',
					context,
				);
				break;
			case 'conflict':
				this.logger.error(
					'Could not seed the system trusted source: another trusted source holds its name or issuer',
					{ ...context, name: SYSTEM_TRUSTED_SOURCE_NAME },
				);
				break;
		}
	}
}
