import { Logger } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import type { TrustedSourceConfigInput } from '@n8n/inbound-auth';

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
 * Each process sets the issuer to its own instance base URL. That URL is also the `iss` of the
 * tokens that a main or webhook process mints. So every process must resolve the same base URL: a
 * process that resolves another one moves the issuer away from the tokens of the others.
 */
@Service()
export class SystemTrustedSourceSeeder {
	constructor(
		private readonly store: TrustedSourceDbStore,
		private readonly urlService: UrlService,
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
			case 'conflict':
				this.logger.error(
					'Could not seed the system trusted source: another trusted source holds its name or issuer',
					{ ...context, name: SYSTEM_TRUSTED_SOURCE_NAME },
				);
				break;
		}
	}
}
