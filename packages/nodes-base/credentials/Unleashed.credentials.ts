import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class Unleashed implements ICredentialType {
	name = 'unleashed';
	displayName = 'Unleashed';
	properties = [
		{
			displayName: 'Api Id',
			name: 'apiId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Api Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];
}
