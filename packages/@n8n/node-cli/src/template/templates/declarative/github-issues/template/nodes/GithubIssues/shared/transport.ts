import type {
	IHookFunctions,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IDataObject,
	IHttpRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

export async function githubApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	qs: IDataObject = {},
	body: IDataObject | undefined = undefined,
) {
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	const options: WithRequestTarget<IHttpRequestOptions> = {
		method: method,
		qs,
		body,
		url: requestUrl`https://api.github.com${resource}`,
		json: true,
	};

	const credentialType =
		authenticationMethod === 'accessToken' ? 'githubIssuesApi' : 'githubIssuesOAuth2Api';

	return this.helpers.httpRequestWithAuthentication.call(this, credentialType, options);
}
