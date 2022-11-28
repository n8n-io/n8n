import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/datastore',
	'https://www.googleapis.com/auth/firebase',
];

export class GoogleFirebaseCloudFirestoreOAuth2Api implements ICredentialType {
	name = 'googleFirebaseCloudFirestoreOAuth2Api';
	extends = ['googleOAuth2Api'];
	displayName = 'Google Firebase Cloud Firestore OAuth2 API';
	documentationUrl = 'google/oauth-single-service';
	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
	];
}
