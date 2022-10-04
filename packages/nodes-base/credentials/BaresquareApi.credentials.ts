import {
		ICredentialType,
		INodeProperties,
		NodePropertyTypes,
} from 'n8n-workflow';

export class BaresquareApi implements ICredentialType {
		name = 'baresquareApi';
		displayName = 'Baresquare API';
		// eslint-disable-next-line n8n-nodes-base/cred-class-field-documentation-url-not-http-url
		documentationUrl = 'baresquare';
		properties: INodeProperties[] = [
				{
						displayName: 'API Key',
						name: 'apiKey',
						type: 'string',
						default: '',
				},
		];
}