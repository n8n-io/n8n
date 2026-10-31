import type { INodeProperties } from 'n8n-workflow';

/**
 * Fields that let an `oAuth2Api` credential register its client automatically (CIMD or DCR).
 * `serverUrl` is the authorization server that publishes the registration metadata.
 * The toggle is off by default: the editor stores only non-default values, so existing
 * credentials would switch to automatic registration if the default changed.
 */
export const dynamicClientRegistrationProperties = (serverUrl: string): INodeProperties[] => [
	{
		displayName: 'Register Client Automatically',
		name: 'useDynamicClientRegistration',
		type: 'boolean',
		default: false,
		description:
			'When on, n8n identifies itself automatically: it uses a Client ID Metadata Document (CIMD) when the server supports CIMD, S256 PKCE, and public clients, and your instance has CIMD enabled; otherwise it uses Dynamic Client Registration (DCR). CIMD does not send a registration request. Turn it off if you want to use the client ID and secret of your own app.',
	},
	{
		displayName: 'Server URL',
		name: 'serverUrl',
		type: 'hidden',
		displayOptions: {
			show: {
				useDynamicClientRegistration: [true],
			},
		},
		default: serverUrl,
	},
];
