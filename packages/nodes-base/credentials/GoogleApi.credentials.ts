import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class GoogleApi implements ICredentialType {
	name = 'googleApi';
	displayName = 'Google API';
	documentationUrl = 'google';
	properties = [
		{
			displayName: 'Service Account Email',
			name: 'email',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'The Google Service account similar to user-808@project.iam.gserviceaccount.com.',

		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			lines: 5,
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'Use the multiline editor. Make sure there are exactly 3 lines.<br />-----BEGIN PRIVATE KEY-----<br />KEY IN A SINGLE LINE<br />-----END PRIVATE KEY-----',
		},
		{
			displayName: ' Impersonate a User',
			name: 'inpersonate',
			type: 'boolean' as NodePropertyTypes,
			default: false,
		},
		{
			displayName: 'Email',
			name: 'delegatedEmail',
			type: 'string' as NodePropertyTypes,
			default: '',
			displayOptions: {
				show: {
					inpersonate: [
						true,
					],
				},
			},
			description: 'The email address of the user for which the application is requesting delegated access.',
		},
	];
}
