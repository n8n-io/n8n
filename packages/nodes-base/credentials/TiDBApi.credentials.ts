import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TiDBApi implements ICredentialType {
	name = 'tiDBApi';
	displayName = 'TiDB';
	documentationUrl = 'tiDB';
	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '127.0.0.1',
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string',
			default: 'test',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: 'root',
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
			displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 4000,
		},
		{
			displayName: 'Connect Timeout',
			name: 'connectTimeout',
			type: 'number',
			default: 10000,
			description:
				'The milliseconds before a timeout occurs during the initial connection to the TiDB server',
		},
		{
			displayName: 'Add CA Certificate',
			name: 'addCaCertificate',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'CA Certifdaficate',
			name: 'caCertificate',
			typeOptions: {
				alwaysOpenEditWindow: true,
				password: true,
			},
			displayOptions: {
				show: {
					addCaCertificate: [true],
				},
			},
			type: 'string',
			default: '',
		},
	];
}
