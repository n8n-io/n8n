import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class DisqusApi implements ICredentialType {
	name = 'disqusApi';
	displayName = 'Disqus API';
	documentationUrl = 'disqus';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'Visit your account details page, and grab the Access Token. See <a href="https://disqus.com/api/docs/auth/">Disqus auth</a>.'
		},
	];
}
