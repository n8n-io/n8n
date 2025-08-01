import { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class BrightDataApi implements ICredentialType {
	name = 'brightdataApi';
	displayName = 'BrightData API';
	documentationUrl = 'https://docs.brightdata.com/api-reference/introduction';
	properties: INodeProperties[] = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];

	// This allows the credential to be used by other parts of n8n
	// stating how this credential is injected as part of the request
	// An example is the Http Request node that can make generic calls
	// reusing this credential
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{"Bearer " + $credentials.token}}',
			},
		},
	};
}
