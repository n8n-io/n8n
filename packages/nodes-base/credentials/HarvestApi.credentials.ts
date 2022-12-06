import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class HarvestApi implements ICredentialType {
	name = 'harvestApi';

	displayName = 'Harvest API';

	documentationUrl = 'harvest';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Visit your account details page, and grab the Access Token. See <a href="https://help.getharvest.com/api-v2/authentication-api/authentication/authentication/">Harvest Personal Access Tokens</a>.',
		},
	];
}
