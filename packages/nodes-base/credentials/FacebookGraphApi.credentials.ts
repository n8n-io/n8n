import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class FacebookGraphApi implements ICredentialType {
	name = 'facebookGraphApi';
	displayName = 'Facebook Graph API';
	documentationUrl = 'facebookGraph';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	];
}
