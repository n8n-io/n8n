import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class FreshdeskApi implements ICredentialType {
	name = 'freshdeskApi';
	displayName = 'Freshdesk API';
	properties = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
        },
        {
			displayName: 'Password',
			name: 'password',
			type: 'password' as NodePropertyTypes,
			default: '',
        },
        {
			displayName: 'Domain',
			name: 'domain',
			type: 'string' as NodePropertyTypes,
            default: '',
            placeholder: 'https://domain.freshdesk.com'
		},
	];
}
