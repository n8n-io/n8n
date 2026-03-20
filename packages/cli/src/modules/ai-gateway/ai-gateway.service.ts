import { CredentialsRepository, ProjectRepository, SharedCredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { Credentials } from 'n8n-core';

import { OwnershipService } from '@/services/ownership.service';

import { AiGatewayConfig } from './ai-gateway.config';
import { AI_GATEWAY_CREDENTIAL_TYPE } from './ai-gateway.constants';

const CREDENTIAL_NAME = 'n8n AI Gateway';

@Service()
export class AiGatewayService {
	private modelListCache: { data: unknown; expiresAt: number } | null = null;

	private readonly MODEL_CACHE_TTL_MS = 5 * 60 * 1000;

	constructor(
		private readonly config: AiGatewayConfig,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly ownershipService: OwnershipService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('ai-gateway');
	}

	isEnabled(): boolean {
		return this.config.enabled;
	}

	isConfigured(): boolean {
		return this.config.enabled && this.config.openRouterApiKey.length > 0;
	}

	/**
	 * Create or update the managed gateway credential so it appears in
	 * every LLM node's credential dropdown without user configuration.
	 *
	 * Stores the OpenRouter API key and base URL directly so that nodes
	 * can call OpenRouter without going through a local proxy.
	 */
	async provisionCredential(): Promise<void> {
		const credentialData = {
			apiKey: this.config.openRouterApiKey,
			url: this.config.openRouterBaseUrl,
		};

		const existing = await this.credentialsRepository.findOne({
			where: { type: AI_GATEWAY_CREDENTIAL_TYPE, isManaged: true },
		});

		if (existing) {
			const credentials = new Credentials(
				{ id: existing.id, name: CREDENTIAL_NAME },
				AI_GATEWAY_CREDENTIAL_TYPE,
			);
			credentials.setData(credentialData);
			const encrypted = credentials.getDataToSave();
			await this.credentialsRepository.update(existing.id, {
				data: (encrypted as { data: string }).data,
			});
			this.logger.debug('Updated AI Gateway credential', { id: existing.id });
		} else {
			const credentials = new Credentials(
				{ id: null, name: CREDENTIAL_NAME },
				AI_GATEWAY_CREDENTIAL_TYPE,
			);
			credentials.setData(credentialData);
			const encrypted = credentials.getDataToSave();

			const entity = this.credentialsRepository.create({
				name: CREDENTIAL_NAME,
				type: AI_GATEWAY_CREDENTIAL_TYPE,
				data: (encrypted as { data: string }).data,
				isManaged: true,
				isGlobal: true,
			});
			const saved = await this.credentialsRepository.save(entity);

			const owner = await this.ownershipService.getInstanceOwner();
			const ownerProject = await this.projectRepository.getPersonalProjectForUserOrFail(owner.id);
			await this.sharedCredentialsRepository.save(
				this.sharedCredentialsRepository.create({
					credentialsId: saved.id,
					role: 'credential:owner',
					projectId: ownerProject.id,
				}),
			);

			this.logger.debug('Provisioned AI Gateway credential', { id: saved.id });
		}
	}

	/**
	 * Fetch available models from OpenRouter, with caching.
	 * Uses the OpenRouter SDK (ESM-only, dynamically imported).
	 */
	async listModels(): Promise<unknown> {
		if (this.modelListCache && Date.now() < this.modelListCache.expiresAt) {
			return this.modelListCache.data;
		}

		const { OpenRouter } = await import('@openrouter/sdk');
		const client = new OpenRouter({ apiKey: this.config.openRouterApiKey });
		const data = await client.models.list();

		this.modelListCache = {
			data,
			expiresAt: Date.now() + this.MODEL_CACHE_TTL_MS,
		};

		return data;
	}

	invalidateModelCache() {
		this.modelListCache = null;
	}
}
