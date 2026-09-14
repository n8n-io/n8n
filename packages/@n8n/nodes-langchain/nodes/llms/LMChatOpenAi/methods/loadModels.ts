import { proxyFetch } from '@n8n/ai-utilities';
import { listOpenAiModels } from '@n8n/ai-utilities/model-discovery';
import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { mergeCustomHeaders } from '../../../../utils/helpers';
import { assertOpenAiCredentialAllowsUrl } from '../../../vendors/OpenAi/helpers/credentials';

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('openAiApi');
	const baseUrlOverride = this.getNodeParameter('options.baseURL', '') as string;
	if (baseUrlOverride) {
		assertOpenAiCredentialAllowsUrl(this.getNode(), credentials, baseUrlOverride);
	}
	const baseURL = baseUrlOverride || (credentials.url as string) || 'https://api.openai.com/v1';
	const { openAiDefaultHeaders } = Container.get(AiConfig);
	const lookup = this.helpers.getSecureEgressFilter().createSecureLookup();
	const headers = mergeCustomHeaders(credentials, openAiDefaultHeaders ?? {});

	// Shared with the agents model catalog: endpoint, auth, chat-model filtering
	// (including include-all on custom hosts) live in @n8n/ai-utilities/model-discovery.
	const models = await listOpenAiModels({
		apiKey: credentials.apiKey as string,
		baseURL,
		headers,
		fetch: async (input, init) => await proxyFetch({ input, init, lookup }),
	});

	return {
		results: models
			.filter((model) => !filter || model.id.toLowerCase().includes(filter.toLowerCase()))
			.map((model) => ({ name: model.id, value: model.id })),
	};
}
