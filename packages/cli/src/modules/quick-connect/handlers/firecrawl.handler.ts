import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import axios from 'axios';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import type { QuickConnectBackendOption } from '../quick-connect.config';
import type { IQuickConnectHandler } from './quick-connect.handler';

const FIRECRAWL_API_BASE_URL = 'https://api.firecrawl.dev';

interface FirecrawlCreateUserResponse {
	apiKey: string;
}

@Service()
export class FirecrawlHandler implements IQuickConnectHandler {
	readonly credentialType = 'firecrawlApi';

	async getCredentialData(
		config: QuickConnectBackendOption,
		user: User,
	): Promise<ICredentialDataDecryptedObject> {
		const secret = config.backendFlowConfig.secret;
		const response = await axios.post<FirecrawlCreateUserResponse>(
			`${FIRECRAWL_API_BASE_URL}/admin/integration/create-user`,
			{ email: user.email },
			{
				headers: {
					Authorization: `Bearer ${secret}`,
					'Content-Type': 'application/json',
				},
			},
		);

		return {
			apiKey: response.data.apiKey,
		};
	}
}
