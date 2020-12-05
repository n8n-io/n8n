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
			displayName: 'Email',
			name: 'email',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'The Google Service account similar to user-808@project.iam.gserviceaccount.com.<br />See the <a href="https://github.com/jovotech/learn-jovo/blob/master/tutorials/google-spreadsheet-private-cms/README.md#google-api-console">tutorial</a> on how to create one.',

		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			lines: 5,
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'Use the multiline editor. Make sure there are exactly 3 lines.<br />-----BEGIN PRIVATE KEY-----<br />KEY IN A SINGLE LINE<br />-----END PRIVATE KEY-----',
		},
	];
}
