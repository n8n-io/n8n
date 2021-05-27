import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class IterableApi implements ICredentialType {
	name = 'iterableApi';
	displayName = 'Iterable API';
	documentationUrl = 'iterable';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
