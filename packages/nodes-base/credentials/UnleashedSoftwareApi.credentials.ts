import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class UnleashedSoftwareApi implements ICredentialType {
	name = 'unleashedSoftwareApi';
	displayName = 'Unleashed API';
	properties = [
		{
			displayName: 'API ID',
			name: 'apiId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];
}
