import {
	trustedKeySourceSchema,
	trustedKeySourcesSchema,
	UpdateTrustedKeySourceDto,
	type TrustedKeySource,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Param, Patch, RestController } from '@n8n/decorators';
import { jsonParse } from 'n8n-workflow';

import type { TrustedKeySourceEntity } from '@/modules/identity-substrate/database/entities/trusted-key-source.entity';
import { TrustedKeySyncService } from '@/modules/identity-substrate/services/trusted-key-sync.service';
import { TrustedKeyService } from '@/modules/identity-substrate/services/trusted-key.service';

import type {
	JwksKeySource,
	StaticKeySource,
	TrustedKeySourcePolicy,
} from '../token-exchange.schemas';

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
		policy: source.policy
			? jsonParse<TrustedKeySourcePolicy>(source.policy, { fallbackValue: {} })
			: null,
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
	constructor(
		private readonly trustedKeyService: TrustedKeyService,
		private readonly trustedKeySyncService: TrustedKeySyncService,
		private readonly logger: Logger,
	) {}

	@Get('/')
	@GlobalScope('trustedKeySource:list')
	@Licensed('feat:tokenExchange')
	async listSources(_req: AuthenticatedRequest): Promise<TrustedKeySource[]> {
		const sources = await this.trustedKeyService.listSources();
		return trustedKeySourcesSchema.parse(sources.map(sanitizeSource));
	}

	/**
	 * Only the admin policy is writable. Everything else on a source is derived
	 * — from the SSO discovery document or `N8N_TRUSTED_KEYS` — and is rewritten
	 * on the next refresh, so accepting edits to it would be a lie.
	 *
	 * Logged, not just applied: widening the accepted audiences of a trusted
	 * issuer changes who can authenticate to this instance, so the change needs
	 * to be attributable after the fact.
	 */
	@Patch('/:id')
	@GlobalScope('trustedKeySource:update')
	@Licensed('feat:tokenExchange')
	async updateSource(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('id') id: string,
		@Body payload: UpdateTrustedKeySourceDto,
	): Promise<TrustedKeySource> {
		const updated = await this.trustedKeySyncService.updateSourcePolicy(id, payload.policy);

		this.logger.info('Trusted key source policy updated', {
			sourceId: id,
			issuer: updated.issuer,
			userId: req.user.id,
			policy: payload.policy,
		});

		return trustedKeySourceSchema.parse(sanitizeSource(updated));
	}
}
