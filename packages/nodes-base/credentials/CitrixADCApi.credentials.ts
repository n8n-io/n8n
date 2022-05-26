import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CitrixADCApi implements ICredentialType {
	name = 'citrixADCApi';
	displayName = 'Citrix ADC API';
	documentationUrl = 'citrix';
	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			default: '',
			required: true,
			typeOptions: {
				password: true,
			},
		},
	];
}
