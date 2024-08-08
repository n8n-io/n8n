import Container, { Service } from 'typedi';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { assert, type IUser } from 'n8n-workflow';
import { License } from '../License';
import { N8N_VERSION } from '../constants';
import config from '@/config';

@Service()
export class AiAssistantService {
	private client: AiAssistantClient | undefined;

	private licenseService: License;

	constructor() {
		this.licenseService = Container.get(License);
	}

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

	async chat(payload: object, user: IUser) {
		if (!this.client) {
			await this.init();
		}
		assert(this.client, 'Assistant client not setup');

		await this.client.chat(payload, { id: user.id });
	}
}
