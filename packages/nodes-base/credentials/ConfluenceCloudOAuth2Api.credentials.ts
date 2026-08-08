import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

import { confluenceDefaultScopes } from './common/atlassian-scopes';

const defaultScopes = confluenceDefaultScopes;

export class ConfluenceCloudOAuth2Api implements ICredentialType {
	name = 'confluenceCloudOAuth2Api';

	extends = ['atlassianOAuth2Api'];

	displayName = 'Confluence Cloud OAuth2 API';

	documentationUrl = 'confluence';

	properties: INodeProperties[] = [
		{
			displayName: 'Enabled Scopes',
			name: 'enabledScopes',
			type: 'string',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
			default: defaultScopes.join(' '),
			description: 'Scopes that should be enabled',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'={{$self["customScopes"] ? $self["enabledScopes"] : "' + defaultScopes.join(' ') + '"}}',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.atlassian.com',
			url: '/oauth/token/accessible-resources',
			method: 'GET',
		},
	};
}
