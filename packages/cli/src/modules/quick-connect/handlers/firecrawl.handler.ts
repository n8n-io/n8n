import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
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
	private config: FirecrawlQuickConnect | undefined;

	private readonly http: HttpRequestClient;

	constructor(outboundHttp: OutboundHttp) {
		this.http = outboundHttp.requests({
			ssrf: 'disabled', // Fixed third-party vendor host
		});
	}

	setConfig(config: FirecrawlQuickConnect) {
		this.config = config;
	}

	async getCredentialData({ email }: User) {
		const secret = this.config!.backendFlowConfig.secret;
		const response = (await this.http.request({
			url: `${FIRECRAWL_API_BASE_URL}/admin/integration/create-user`,
			method: 'POST',
			body: { email },
			headers: {
				Authorization: `Bearer ${secret}`,
				'Content-Type': 'application/json',
			},
			json: true,
		})) as FirecrawlCreateUserResponse;

		return {
			apiKey: response.apiKey,
		};
	}
}
