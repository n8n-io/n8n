import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ProfitWellApi implements ICredentialType {
	name = 'profitWellApi';
	displayName = 'ProfitWell API';
	documentationUrl = 'profitWell';
	properties = [
		{
			displayName: 'API Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'Your Private Token',
		},
	];
}