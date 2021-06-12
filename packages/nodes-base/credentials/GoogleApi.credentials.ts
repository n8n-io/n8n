import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class GoogleApi implements ICredentialType {
	name = 'googleApi';
	displayName = 'Google API';
	documentationUrl = 'google';
	properties: INodeProperties[] = [
		{
			displayName: 'Service Account Email',
			name: 'email',
			type: 'string',
			default: '',
			description: 'The Google Service account similar to user-808@project.iam.gserviceaccount.com.',

		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			default: '',
			description: 'Use the multiline editor. Make sure there are exactly 3 lines.<br />-----BEGIN PRIVATE KEY-----<br />KEY IN A SINGLE LINE<br />-----END PRIVATE KEY-----',
		},
		{
			displayName: ' Impersonate a User',
			name: 'inpersonate',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Email',
			name: 'delegatedEmail',
			type: 'string',
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
