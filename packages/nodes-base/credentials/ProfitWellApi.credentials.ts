import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ProfitWellApi implements ICredentialType {
	name = 'profitWellApi';
	displayName = 'ProfitWell API';
	documentationUrl = 'profitWell';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'accessToken',
			type: 'string',
			default: '',
			description: 'Your Private Token',
		},
	];
}
