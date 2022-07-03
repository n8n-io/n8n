// import {
// 	ICredentialType,
// 	NodePropertyTypes,
// } from 'n8n-workflow';

// export class NetlifyOAuth2Api implements ICredentialType {
// 	name = 'netlifyOAuth2Api';
// 	extends = [
// 		'oAuth2Api',
// 	];
// 	displayName = 'Netlify OAuth2 API';
// 	documentationUrl = 'netlify';
// 	properties = [
// 		{
// 			displayName: 'Authorization URL',
// 			name: 'authUrl',
// 			type: 'hidden' as NodePropertyTypes,
// 			default: 'https://app.netlify.com/authorize',
// 			required: true,
// 		},
// 		{
// 			displayName: 'Client ID',
// 			name: 'clientId',
// 			type: 'string' as NodePropertyTypes,
// 			default: '',
// 			required: true,
// 		},
// 		{
// 			displayName: 'Client Secret',
// 			name: 'clientSecret',
// 			type: 'string' as NodePropertyTypes,
// 			default: '',
// 			required: true,
// 		},
// 		{
// 			displayName: 'Authentication',
// 			name: 'authentication',
// 			type: 'hidden' as NodePropertyTypes,
// 			default: 'body',
// 		},
// 		{
//             displayName: 'Access Token URL',
//             name: 'accessTokenUrl',
//             type: 'hidden' as NodePropertyTypes,
//             default: 'https://api.netlify.com/api/v1/oauth/tickets',
// 		},
// 		{
// 			displayName: 'Scope',
// 			name: 'scope',
// 			type: 'hidden' as NodePropertyTypes,
// 			default: '',
// 		},
// 		{
// 			displayName: 'Auth URI Query Parameters',
// 			name: 'authQueryParameters',
// 			type: 'hidden' as NodePropertyTypes,
// 			default: '',
// 		}
// 	];
// }
