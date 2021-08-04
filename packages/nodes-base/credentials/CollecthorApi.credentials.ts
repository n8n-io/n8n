import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class CollecthorApi implements ICredentialType {
	name = 'collecthorApi';
	displayName = 'Collecthor API';
	documentationUrl = 'collecthor';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
