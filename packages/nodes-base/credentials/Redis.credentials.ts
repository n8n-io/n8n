import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class Redis implements ICredentialType {
	name = 'redis';
	displayName = 'Redis';
	documentationUrl = 'redis';
	properties = [
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string' as NodePropertyTypes,
			default: 'localhost',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number' as NodePropertyTypes,
			default: 6379,
		},
	];
}
