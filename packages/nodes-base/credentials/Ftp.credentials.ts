import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class Ftp implements ICredentialType {
	name = 'ftp';
	displayName = 'FTP';
	documentationUrl = 'ftp';
	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			required: true,
			type: 'string',
			default: '',
			placeholder: 'localhost',
		},
		{
			displayName: 'Port',
			name: 'port',
			required: true,
			type: 'number',
			default: 21,
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Connect using SSL/TLS',
			name: 'secure',
			type: 'options',
			options: [
				{
					name: 'False',
					value: false,
					description: 'Disable secure connection',
				},
				{
					name: 'True',
					value: true,
					description: 'Enable encryption for control & data connection',
				},
				{
					name: 'Control',
					value: 'control',
					description: 'Enable encryption for control connection only',
				},
			],
			default: false,
		},
		{
			displayName: 'Ignore Certificate Validation',
			name: 'disableCertificateValidation',
			displayOptions: {
				hide: {
					secure: [false],
				},
			},
			type: 'boolean',
			default: false,
		},
	];
}
