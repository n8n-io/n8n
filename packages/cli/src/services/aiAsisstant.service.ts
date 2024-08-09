import Container, { Service } from 'typedi';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { assert, type IUser } from 'n8n-workflow';
import { License } from '../License';
import { N8N_VERSION } from '../constants';
import config from '@/config';
import type { AiAssistantRequest } from '@/requests';

@Service()
export class AiAssistantService {
	private client: AiAssistantClient | undefined;

	async init() {
		const licenseService = Container.get(License);
		const aiAssistantEnabled = licenseService.isAiAssistantEnabled();
		if (!aiAssistantEnabled) {
			return;
		}

		const licenseCert = await licenseService.loadCertStr();
		const consumerId = licenseService.getConsumerId();
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

	async chat(payload: object, user: IUser) {
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
