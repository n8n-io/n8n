import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class FileMaker implements ICredentialType {
	name = 'fileMaker';
	displayName = 'FileMaker API';
	documentationUrl = 'fileMaker';
	properties = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Database',
			name: 'db',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Login',
			name: 'login',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
