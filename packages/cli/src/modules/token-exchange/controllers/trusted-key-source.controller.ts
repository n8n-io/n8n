import { trustedKeySourcesSchema, type TrustedKeySource } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Licensed, RestController } from '@n8n/decorators';
import { jsonParse } from 'n8n-workflow';

import type { TrustedKeySourceEntity } from '@/modules/identity-substrate/database/entities/trusted-key-source.entity';
import { TrustedKeyService } from '@/modules/identity-substrate/services/trusted-key.service';

import type { JwksKeySource, StaticKeySource } from '../token-exchange.schemas';

/**
 * Strips raw key material from a source's `config` before it leaves the
 * server — the rest of the config (issuer, audience, roles, ...) is safe to
 * expose to admins reviewing the instance's trust configuration.
 */
function sanitizeSource(source: TrustedKeySourceEntity): TrustedKeySource {
	const base = {
		id: source.id,
		issuer: source.issuer,
		status: source.status,
		lastError: source.lastError,
		lastRefreshedAt: source.lastRefreshedAt,
		managedBy: source.managedBy,
		createdAt: source.createdAt,
		updatedAt: source.updatedAt,
	};

	if (source.type === 'static') {
		const staticConfigs = jsonParse<StaticKeySource[]>(source.config, { fallbackValue: [] });
		return {
			...base,
			type: 'static' as const,
			config: staticConfigs.map(({ key: _key, type: _type, ...rest }) => rest),
		};
	}

	const { type: _type, ...jwksConfig } = jsonParse<JwksKeySource>(source.config, {
		fallbackValue: { type: 'jwks', url: '', issuer: '' },
	});
	return {
		...base,
		type: 'jwks' as const,
		config: jwksConfig,
	};
}

@RestController('/trusted-key-sources')
export class TrustedKeySourceController {
	constructor(private readonly trustedKeyService: TrustedKeyService) {}

	@Get('/')
	@GlobalScope('trustedKeySource:list')
	@Licensed('feat:tokenExchange')
	async listSources(_req: AuthenticatedRequest): Promise<TrustedKeySource[]> {
		const sources = await this.trustedKeyService.listSources();
		return trustedKeySourcesSchema.parse(sources.map(sanitizeSource));
	}
}
