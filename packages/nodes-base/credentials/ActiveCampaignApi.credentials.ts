import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class ActiveCampaignApi implements ICredentialType {
	name = 'activeCampaignApi';
	displayName = 'ActiveCampaign API';
	documentationUrl = 'activeCampaign';
	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
