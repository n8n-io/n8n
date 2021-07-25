import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class IrcNetwork implements ICredentialType {
	name = 'ircNetwork';
	displayName = 'IRC Network';
	documentationUrl = 'ircNetwork';
	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'irc.libera.chat',
			description: 'Hostname or IP address of the IRC network. If you\'re using TLS with certificate validation, this MUST be a hostname.',
		},
		{
			displayName: 'Server Password',
			name: 'serverPassword',
			type: 'string',
			default: '',
			description: 'Password to connect to the IRC network.',
		},
		{
			displayName: 'Nickname',
			name: 'nickname',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'n8n-bot',
			description: 'Nickname to use on the IRC network.',
		},
		{
			displayName: 'Account Login',
			name: 'saslType',
			type: 'options',
			options: [
				{
					name: 'None',
					value: 'none',
					description: 'Don\'t try to login to an account.',
				},
				{
					name: 'SASL PLAIN',
					value: 'plain',
					description: 'Login with username and password.',
				},
			],
			default: 'none',
			description: 'Login to an account (a NickServ account, using SASL PLAIN).',
		},
		{
			displayName: 'Only connect if SASL is successful',
			name: 'saslRequired',
			type: 'boolean',
			default: true,
			description: 'Require successful SASL login to connect to the network.',
			displayOptions: {
				hide: {
					'saslType': [
						'none',
					],
				},
			},
		},
		{
			displayName: 'Account Name',
			name: 'saslAccountName',
			type: 'string',
			required: true,
			default: '',
			description: 'Account to login with.',
			displayOptions: {
				show: {
					'saslType': [
						'plain',
					],
				},
			},
		},
		{
			displayName: 'Account Password',
			name: 'saslAccountPassword',
			type: 'string',
			required: true,
			default: '',
			typeOptions: {
				password: true,
			},
			description: 'Password to login with.',
			displayOptions: {
				show: {
					'saslType': [
						'plain',
					],
				},
			},
		},
		{
			displayName: 'Ident',
			name: 'ident',
			type: 'string',
			default: 'n8n',
			description: 'The \'username\' sent in the USER command.',
		},
		{
			displayName: 'Realname field',
			name: 'realname',
			type: 'string',
			default: 'n8n integration',
			description: 'The \'realname\' sent in the USER command.',
		},
		{
			displayName: 'Use TLS',
			name: 'tls',
			type: 'boolean',
			default: true,
			description: 'Connect securely using TLS.',
		},
		{
			displayName: 'Force TLS Certificate Validation',
			name: 'tlsValidation',
			type: 'boolean',
			default: true,
			description: 'Ensure a valid TLS certificate is returned by the server. This should be disabled for self-signed certificates.',
			displayOptions: {
				show: {
					'tls': [
						true,
					],
				},
			},
		},
		// we use two ports here to auto-switch between 6697 and 6667 depending
		//  on whether TLS is enabled or not. we really want to encourage TLS
		//  use here, so we're okay keeping this section a little more hidden
		{
			displayName: 'Port',
			name: 'tlsPort',
			displayOptions: {
				show: {
					'tls': [
						true,
					],
				},
			},
			type: 'number',
			typeOptions: {
				minValue: 1,
				maxValue: 65535,
			},
			default: 6697,
			description: 'TCP port to connect on.',
		},
		{
			displayName: 'Port',
			name: 'plainPort',
			displayOptions: {
				show: {
					'tls': [
						false,
					],
				},
			},
			type: 'number',
			typeOptions: {
				minValue: 1,
				maxValue: 65535,
			},
			default: 6667,
			description: 'TCP port to connect on.',
		},
	];
}
