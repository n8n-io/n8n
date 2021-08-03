import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MonicaCrmApi implements ICredentialType {
	name = 'monicaCrmApi';
	displayName = 'Monica CRM API';
	documentationUrl = 'monicaCrm';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
	];
}
