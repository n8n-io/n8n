import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const defaultScopes = ['refresh_token', 'session:role:SYSADMIN'];

export class SnowflakeOAuth2Api implements ICredentialType {
	name = 'snowflakeOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Snowflake OAuth2 API';

	documentationUrl = 'snowflake';

	properties: INodeProperties[] = [
		{
			displayName: 'Account',
			name: 'account',
			type: 'string',
			default: '',
			required: true,
			description:
				'Your Snowflake account identifier (e.g. <code>xy12345</code> or <code>xy12345.us-east-1</code>). Used to construct the OAuth2 authorization and token URLs.',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string',
			default: '',
			description: 'Specify the database you want to use after creating the connection',
		},
		{
			displayName: 'Warehouse',
			name: 'warehouse',
			type: 'string',
			default: '',
			description:
				'The default virtual warehouse to use for the session after connecting. Used for performing queries, loading data, etc.',
		},
		{
			displayName: 'Schema',
			name: 'schema',
			type: 'string',
			default: '',
			description: 'Enter the schema you want to use after creating the connection',
		},
		{
			displayName: 'Client Session Keep Alive',
			name: 'clientSessionKeepAlive',
			type: 'boolean',
			default: false,
			description:
				"Whether to keep alive the client session. By default, client connections typically time out approximately 3-4 hours after the most recent query was executed. If the parameter clientSessionKeepAlive is set to true, the client's connection to the server will be kept alive indefinitely, even if no queries are executed.",
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'pkce',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '=https://{{$self["account"]}}.snowflakecomputing.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '=https://{{$self["account"]}}.snowflakecomputing.com/oauth/token-request',
			required: true,
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
		{
			displayName: 'Custom Scopes',
			name: 'customScopes',
			type: 'boolean',
			default: false,
			description: 'Define custom scopes',
		},
		{
			displayName:
				'The default scopes needed for the node to work are already set. If you change these the node may not function correctly.',
			name: 'customScopesNotice',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
		},
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
