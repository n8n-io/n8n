import {
	ICredentialType,
	ICredentialTypes,
	INodeProperties,
} from 'n8n-workflow';

export class LEDGERSApi implements ICredentialType {
	name = 'LEDGERSApi';
	displayName = 'LEDGERS API';
	documentationUrl = '';
	properties: INodeProperties[] = [
		{
			displayName: 'X-API-Key',
			name: 'xApiKey',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];
}
