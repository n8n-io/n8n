import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class UnleashedSoftwareApi implements ICredentialType {
	name = 'unleashedSoftwareApi';
	displayName = 'Unleashed API';
	documentationUrl = 'unleashedSoftware';
	properties: INodeProperties[] = [
		{
			displayName: 'API ID',
			name: 'apiId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];
}
