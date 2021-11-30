import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const scopes = [
	'permits.content.read',
	'isolations.content.read',
	'riskAssessments.content.read'
];

export class EnablonOrmOAuth2Api implements ICredentialType {
	name = 'enablonOrmOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Enablon ORM OAuth2 API';
	documentationUrl = 'enablon';
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://www.enablon.com/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.enablonormapi.com/oauth2/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'token_access_type=offline&force_reapprove=true',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
		{
			displayName: 'APP Access Type',
			name: 'accessType',
			type: 'options',
			options: [
				{
					name: 'Permits',
					value: 'permits',
				},
				{
					name: 'Isolations',
					value: 'isolations',
				},
				{
					name: 'Risk Assessments',
					value: 'riskAssessments',
				},
				{
					name: 'Full Enablon ORM',
					value: 'full',
				},
			],
			default: 'full',
		},
	];
}
