import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftAgent365Api implements ICredentialType {
	name = 'microsoftAgent365Api';

	displayName = 'Microsoft 365 Agent API';

	documentationUrl = 'microsoftagent365';

	properties: INodeProperties[] = [
		{
			displayName: 'Tenant ID',
			name: 'tenantId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			// required: true, TODO enable
			default: '',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
