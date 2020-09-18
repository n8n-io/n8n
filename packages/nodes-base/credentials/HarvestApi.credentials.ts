import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class HarvestApi implements ICredentialType {
	name = 'harvestApi';
	displayName = 'Harvest API';
	documentationUrl = 'harvest';
	properties = [
		{
			displayName: 'Account ID',
			name: 'accountId',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'Visit your account details page, and grab the Account ID. See <a href="https://help.getharvest.com/api-v2/authentication-api/authentication/authentication/">Harvest Personal Access Tokens</a>.'
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'Visit your account details page, and grab the Access Token. See <a href="https://help.getharvest.com/api-v2/authentication-api/authentication/authentication/">Harvest Personal Access Tokens</a>.'
		},
	];
}
