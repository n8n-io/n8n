import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class GoogleApi implements ICredentialType {
	name = 'googleApi';
	displayName = 'Google API';
	properties = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string' as NodePropertyTypes,
			default: '',

		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			lines: 5,
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
