import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class NocoDb implements ICredentialType {
	name = 'nocoDb';
	displayName = 'NocoDB';
	documentationUrl = 'nocoDb';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
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
