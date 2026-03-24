import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { getN8nAiGatewayOpenRouterConfig } from '../../../../utils/n8nAiGatewayOpenRouter';

export async function chatCompletion(
	this: IExecuteFunctions,
	_itemIndex: number,
	body: IDataObject,
): Promise<unknown> {
	const { apiKey, baseUrl } = getN8nAiGatewayOpenRouterConfig();
	const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

	return await this.helpers.httpRequest({
		method: 'POST',
		url,
		headers: { Authorization: `Bearer ${apiKey}` },
		body,
		json: true,
	});
}
