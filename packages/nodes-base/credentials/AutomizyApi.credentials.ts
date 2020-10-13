import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class AutomizyApi implements ICredentialType {
	name = 'automizyApi';
	displayName = 'Automizy API';
	properties = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
