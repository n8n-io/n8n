import type { IHookFunctions, IHttpRequestMethods } from 'n8n-workflow';

export async function honeyBookApiRequest(
	this: IHookFunctions,
	method: IHttpRequestMethods,
	path: string,
	body: any = {},
) {
	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'honeyBookApi', {
		baseURL: 'http://localhost:8000/api/v2',
		url: path,
		method,
		body,
	});

	return response;
}
