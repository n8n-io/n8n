import type { AiAssistantSDK } from '@n8n_io/ai-assistant-sdk';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { assert, type IUser } from 'n8n-workflow';
import { Service } from 'typedi';
import type { Response } from 'undici';

import config from '@/config';
import type { AiAssistantRequest } from '@/requests';

import { N8N_VERSION } from '../constants';
import { License } from '../license';

@Service()
export class AiAssistantService {
	private client: AiAssistantClient | undefined;

	constructor(private readonly licenseService: License) {}

	async init() {
		const aiAssistantEnabled = this.licenseService.isAiAssistantEnabled();
		if (!aiAssistantEnabled) {
			return;
		}

		const licenseCert = await this.licenseService.loadCertStr();
		const consumerId = this.licenseService.getConsumerId();
		const baseUrl = config.get('aiAssistant.baseUrl');
		const logLevel = config.getEnv('logs.level');

		this.client = new AiAssistantClient({
			licenseCert,
			consumerId,
			n8nVersion: N8N_VERSION,
			baseUrl,
			logLevel,
		});
	}

	async chat(payload: AiAssistantSDK.ChatRequestPayload, user: IUser): Promise<Response> {
		if (!this.client) {
			await this.init();
		}
		assert(this.client, 'Assistant client not setup');

		return await this.client.chat(payload, { id: user.id });
	}

	async applySuggestion(payload: AiAssistantRequest.SuggestionPayload, user: IUser) {
		if (!this.client) {
			await this.init();
		}
		assert(this.client, 'Assistant client not setup');

		return await this.client.applySuggestion(payload, { id: user.id });
	}
}
