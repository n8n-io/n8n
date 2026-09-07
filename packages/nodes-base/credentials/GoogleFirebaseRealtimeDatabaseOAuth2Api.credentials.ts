import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/userinfo.email',
	'https://www.googleapis.com/auth/firebase.database',
	'https://www.googleapis.com/auth/firebase',
];

export class GoogleFirebaseRealtimeDatabaseOAuth2Api implements ICredentialType {
	name = 'googleFirebaseRealtimeDatabaseOAuth2Api';

	extends = ['googleOAuth2Api'];

	displayName = 'Google Firebase Realtime Database OAuth2 API';

	documentationUrl = 'google/oauth-single-service';

	properties: INodeProperties[] = [
		{
			displayName: 'Custom Scopes',
			name: 'customScopes',
			type: 'boolean',
			default: false,
			description: 'Define custom scopes',
		},
		{
			displayName:
				'The default scopes needed for the node to work are already set, If you change these the node may not function correctly.',
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
			default: scopes.join(' '),
			description: 'Scopes that should be enabled',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '={{$self["customScopes"] ? $self["enabledScopes"] : "' + scopes.join(' ') + '"}}',
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			default: 'firebaseio.com',
			options: [
				{
					name: 'us-central1',
					value: 'firebaseio.com',
				},
				{
					name: 'europe-west1',
					value: 'europe-west1.firebasedatabase.app',
				},
				{
					name: 'asia-southeast1',
					value: 'asia-southeast1.firebasedatabase.app',
				},
			],
		},
	];
}
