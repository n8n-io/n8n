import type { ICredentialType, INodeProperties } from 'n8n-workflow';

import { jiraDefaultScopes } from './common/atlassian-scopes';

const defaultScopes = jiraDefaultScopes;

export class JiraSoftwareCloudOAuth2Api implements ICredentialType {
	name = 'jiraSoftwareCloudOAuth2Api';

	extends = ['atlassianOAuth2Api'];

	displayName = 'Jira SW Cloud OAuth2 API';

	documentationUrl = 'jira';

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
}
