import type {
	AiApplySuggestionRequestDto,
	AiAskRequestDto,
	AiChatRequestDto,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { InstanceSettings } from 'n8n-core';
import { assert, type IUser } from 'n8n-workflow';

import { N8N_VERSION } from '../constants';
import { License } from '../license';

@Service()
export class AiService {
	private client: AiAssistantClient | undefined;

	private initPromise: Promise<void> | undefined;

	constructor(
		private readonly licenseService: License,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
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
		return await client.generateAiCreditsCredentials(user);
	}
}
