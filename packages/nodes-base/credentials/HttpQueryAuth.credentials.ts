import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class HttpQueryAuth implements ICredentialType {
	name = 'httpQueryAuth';
	displayName = 'Query Auth';
	documentationUrl = 'httpRequest';
	icon = 'node:n8n-nodes-base.httpRequest';
	properties: INodeProperties[] = [
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',

		},
		{
			displayName: 'Value',
			name: 'value',
			type: 'string',
			default: '',
		},
	];
}
