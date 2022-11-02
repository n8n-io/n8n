import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class HubspotApi implements ICredentialType {
	name = 'hubspotApi';
	displayName = 'HubSpot API';
	documentationUrl = 'hubspot';
	properties: INodeProperties[] = [
		{
			displayName:
				'On 30 November, 2022 Hubspot will remove API key support. You will have to connect to HubSpot using a private app or Oauth authentication method. <a href="https://developers.hubspot.com/changelog/upcoming-api-key-sunset">More details</a>',
			name: 'notice',
			type: 'notice',
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
