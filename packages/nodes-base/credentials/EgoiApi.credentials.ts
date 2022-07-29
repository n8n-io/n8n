import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class EgoiApi implements ICredentialType {
	name = 'egoiApi';
	displayName = 'E-goi API';
	documentationUrl = 'egoi';
	properties: INodeProperties[] = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
