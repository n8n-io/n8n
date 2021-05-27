import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class LemlistApi implements ICredentialType {
	name = 'lemlistApi';
	displayName = 'Lemlist API';
	documentationUrl = 'lemlist';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
