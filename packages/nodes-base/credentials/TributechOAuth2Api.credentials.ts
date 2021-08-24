import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TributechOAuth2Api implements ICredentialType {
	name = 'tributechOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Tributech';
	documentationUrl = 'tributech';
	properties: INodeProperties[] = [
		{
			displayName: 'Node',
			name: 'node',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Hub',
			name: 'hub',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: 'openid profile data-api trust-api catalog-api twin-api node-id offline_access',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '=https://auth.{{$self["hub"]}}.dataspace-hub.com/auth/realms/{{$self["node"]}}/protocol/openid-connect/auth',
			required: false,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '=https://auth.{{$self["hub"]}}.dataspace-hub.com/auth/realms/{{$self["node"]}}/protocol/openid-connect/token',
			required: true,
		},
		{
			displayName: 'Trust-API Endpoint',
			name: 'trustApiEndpoint',
			type: 'hidden',
			default: '=https://trust-api.{{$self["node"]}}.dataspace-node.com',
			required: true,
		},
		{
			displayName: 'Data-API Endpoint',
			name: 'dataApiEndpoint',
			type: 'hidden',
			default: '=https://data-api.{{$self["node"]}}.dataspace-node.com',
			required: true,
		},
		{
			displayName: 'Twin-API Endpoint',
			name: 'twinApiEndpoint',
			type: 'hidden',
			default: '=https://twin-api.{{$self["node"]}}.dataspace-node.com',
			required: true,
		},
		{
			displayName: 'Catalog-API Endpoint',
			name: 'catalogApiEndpoint',
			type: 'hidden',
			default: '=https://catalog-api.{{$self["node"]}}.dataspace-node.com',
			required: true,
		},
	];
}
