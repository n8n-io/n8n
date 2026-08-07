import type {
	AiApplySuggestionRequestDto,
	AiAskRequestDto,
	AiChatRequestDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import { assert, OperationalError, type IUser } from 'n8n-workflow';

import { N8N_VERSION } from '../constants';
import { License } from '../license';
import { callAiServiceWithRetry } from '../utils/ai-service-retry';

@Service()
export class AiService {
	private client: AiAssistantClient | undefined;

	private initPromise: Promise<void> | undefined;

	constructor(
		private readonly licenseService: License,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {}

	async init() {
		const aiAssistantEnabled = this.licenseService.isAiAssistantEnabled();

		if (!aiAssistantEnabled) {
			return;
		}

		const licenseCert = await this.licenseService.loadCertStr();
		const consumerId = this.licenseService.getConsumerId();
		const baseUrl = this.globalConfig.aiAssistant.baseUrl;
		const logLevel = this.globalConfig.logging.level;

		this.client = new AiAssistantClient({
			licenseCert,
			consumerId,
			n8nVersion: N8N_VERSION,
			baseUrl,
			logLevel,
			instanceId: this.instanceSettings.instanceId,
		});

		// Register for license certificate updates
		this.licenseService.onCertRefresh((cert) => {
			this.client?.updateLicenseCert(cert);
		});
	}

	async chat(payload: AiChatRequestDto, user: IUser) {
		const client = await this.getClient();
		return await client.chat(payload, { id: user.id });
	}

	async applySuggestion(payload: AiApplySuggestionRequestDto, user: IUser) {
		const client = await this.getClient();
		return await client.applySuggestion(payload, { id: user.id });
	}

	async askAi(payload: AiAskRequestDto, user: IUser) {
		const client = await this.getClient();
		return await client.askAi(payload, { id: user.id });
	}

	/** Whether the AI service proxy is enabled (license + base URL configured). */
	isProxyEnabled(): boolean {
		return this.licenseService.isAiAssistantEnabled() && !!this.globalConfig.aiAssistant.baseUrl;
	}

	/** Return the initialized AiAssistantClient. Initializes lazily if needed. */
	async getClient(): Promise<AiAssistantClient> {
		if (!this.client) {
			this.initPromise ??= this.init();
			await this.initPromise;
			if (!this.client) {
				this.initPromise = undefined; // allow retry after license activation
			}
		}
		assert(this.client, 'AI Assistant client not initialized');
		return this.client;
	}

	async createFreeAiCredits(user: IUser) {
		const client = await this.getClient();
		return await callAiServiceWithRetry(
			'AI credits credential generation',
			async () => await client.generateAiCreditsCredentials(user),
			this.logger,
			this.errorReporter,
			{ retryOnTimeout: false },
		);
	}

	/**
	 * Forfeit the remaining Instance AI quota for this instance (INS-1082). Idempotent server-side,
	 * so callers re-assert it rather than depending on one call landing.
	 *
	 * Posted directly rather than through the SDK because the pinned SDK version predates
	 * `lockInstanceAiQuota`; swap the body for that call once the catalog is bumped. Everything else
	 * — retries, the caller, the response shape — stays as it is.
	 */
	async lockInstanceAiQuota(
		user: IUser,
		activatedAt?: number,
	): Promise<{ creditsQuota: number; creditsClaimed: number; quotaLocked: boolean }> {
		const licenseCert = await this.licenseService.loadCertStr();
		const url = `${this.globalConfig.aiAssistant.baseUrl}/v1/instance-ai/lock-quota`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-user-id': user.id,
				'x-instance-id': this.instanceSettings.instanceId,
				'x-n8n-version': N8N_VERSION,
			},
			body: JSON.stringify({
				licenseCert,
				...(activatedAt !== undefined ? { activatedAt } : {}),
			}),
		});

		if (!response.ok) {
			throw new OperationalError(
				`Failed to lock Instance AI quota: ${response.status} ${response.statusText}`,
			);
		}

		return (await response.json()) as {
			creditsQuota: number;
			creditsClaimed: number;
			quotaLocked: boolean;
		};
	}
}
