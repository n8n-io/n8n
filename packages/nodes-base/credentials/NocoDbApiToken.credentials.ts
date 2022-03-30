import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class NocoDbApiToken implements ICredentialType {
	name = 'nocoDbApiToken';
	displayName = 'NocoDB API Token';
	documentationUrl = 'nocoDb';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'nocoDbApiToken',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
			placeholder: 'http(s)://localhost:8080',
		},
	];
}
