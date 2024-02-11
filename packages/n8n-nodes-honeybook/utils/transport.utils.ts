import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { OptionsWithUri } from 'request';

type HBApiRequestParams = {
	nodeExecutionContext: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IPollFunctions;
	host?: string;
	method: string;
	resource: string;
	body?: any;
	qs?: IDataObject;
	uri?: string;
	option?: IDataObject;
}

export async function honeyBookApiRequest({
	host = process.env['HB_API_ENDPOINT'] || 'http://localhost:8000',
	nodeExecutionContext,
	method,
	resource,
	body = {},
	qs = {},
	uri,
	option = {},
}: HBApiRequestParams): Promise<any> {
	try {


		uri = uri || `${host}${host.endsWith("/") ? "" : "/"}${resource}`;
		let options: OptionsWithUri = {
			headers: {},
			method,
			qs,
			body,
			uri,
			json: true,
		};
		options = Object.assign({}, options, option);
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		return await nodeExecutionContext.helpers.requestWithAuthentication.call(nodeExecutionContext, 'honeyBookApi', options);
	} catch (error) {
		console.log('=== HB API REQUEST ERROR ===', error);
		throw new NodeApiError(nodeExecutionContext.getNode(), error as JsonObject);
	}
}