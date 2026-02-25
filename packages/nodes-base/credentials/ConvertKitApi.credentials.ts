import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { getUrl } from './common/http';

export class ConvertKitApi implements ICredentialType {
	name = 'convertKitApi';

	displayName = 'ConvertKit API';

	documentationUrl = 'convertkit';

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
		const secret = {
			api_secret: credentials.apiSecret as string,
		};
		// it's a webhook so include the api secret on the body
		if (url?.includes('/automations/hooks')) {
			options.body = options.body || {};
			if (typeof options.body === 'object') {
				Object.assign(options.body, secret);
			}
		} else {
			options.qs = options.qs || {};
			if (typeof options.qs === 'object') {
				Object.assign(options.qs, secret);
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
