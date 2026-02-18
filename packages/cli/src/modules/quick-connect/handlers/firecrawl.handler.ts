import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { FirecrawlQuickConnect } from '../quick-connect.config';
import { IQuickConnectHandler } from './handler.interface';

const FIRECRAWL_API_BASE_URL = 'https://api.firecrawl.dev';

interface FirecrawlCreateUserResponse {
	apiKey: string;
}

@Service()
export class FirecrawlHandler implements IQuickConnectHandler {
	private config: FirecrawlQuickConnect;

	setConfig(config: FirecrawlQuickConnect) {
		this.config = config;
	}

	async getApiKey({ email }: User) {
		const secret = this.config.backendFlowConfig.secret;
		const response = await fetch(`${FIRECRAWL_API_BASE_URL}/admin/integration/create-user`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${secret}`,
				contentType: 'application/json',
			},
			body: JSON.stringify({ email }),
		});
		const json = (await response.json()) as FirecrawlCreateUserResponse;

		return {
			apiKey: json.apiKey,
		};
	}
}
