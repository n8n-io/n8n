import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class ClickHouse implements ICredentialType {
	name = 'clickHouse';
	displayName = 'ClickHouse';
	documentationUrl = 'clickHouse';
	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'localhost',
		},
				{
						displayName: 'Port',
			name: 'port',
			type: 'number',
			default: 8123,
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string',
			default: '',
		},
				{
						displayName: 'Basic Authentication',
						name: 'basicAuth',
						type: 'boolean',
						default: true,
				},
				{
						displayName: 'User',
						name: 'user',
						type: 'string',
						default: '',
						displayOptions: {
								show: {
										basicAuth: [
												true,
										],
								},
						},
				},
				{
						displayName: 'Password',
						name: 'password',
						type: 'string',
						typeOptions: {
								password: true,
						},
						displayOptions: {
								show: {
										basicAuth: [
												true,
										],
								},
						},
						default: '',
				},
	];
}
