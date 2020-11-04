import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class FacebookGraphSubscriptionApi implements ICredentialType {
	name = 'facebookGraphSubscriptionApi';
	displayName = 'Facebook Graph API';
	extends = [
		'facebookGraphApi',
	];
	properties = [
		{
			displayName: 'APP Secret',
			name: 'appSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: '(Optional) When the app secret is set the node will verify this signature to validate the integrity and origin of the payload.',
		},
	];
}
