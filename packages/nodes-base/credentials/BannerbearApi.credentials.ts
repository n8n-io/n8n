import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class BannerbearApi implements ICredentialType {
	name = 'bannerbearApi';
	displayName = 'Bannerbear API';
	properties = [
		{
			displayName: 'Project API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
