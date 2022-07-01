import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SquarespaceApi implements ICredentialType {
	name = 'squarespaceApi';
	displayName = 'Squarespace API';
	documentationUrl = 'squarespace';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
