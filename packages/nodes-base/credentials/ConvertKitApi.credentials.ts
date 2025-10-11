import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IDataObject,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { getUrl } from './common/http';

export class ConvertKitApi implements ICredentialType {
	name = 'convertKitApi';

	displayName = 'ConvertKit API';

	documentationUrl = 'convertKit';

	properties: INodeProperties[] = [
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];

	async authenticate(credentials: ICredentialDataDecryptedObject, options: IHttpRequestOptions) {
		const url = getUrl(options);
		// it's a webhook so include the api secret on the body
		if (url?.includes('/automations/hooks')) {
			options.body = options.body || {};
			if (typeof options.body === 'object') {
				(options.body as IDataObject).api_secret = credentials.apiSecret as string;
			}
		} else {
			options.qs = options.qs || {};
			if (typeof options.qs === 'object') {
				(options.qs as IDataObject).api_secret = credentials.apiSecret as string;
			}
		}
		return options;
	}

	test: ICredentialTestRequest = {
		request: {
			url: 'https://api.convertkit.com/v3/account',
		},
	};
}
