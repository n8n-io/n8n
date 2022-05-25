import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class EwelinkApi implements ICredentialType {
	name = 'ewelinkApi';
	displayName = 'Ewelink API';
	documentationUrl = 'ewelink';
	properties = [
		{
			displayName: 'Email Address',
			name: 'email',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
