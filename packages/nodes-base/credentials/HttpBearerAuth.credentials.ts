import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class HttpBearerAuth implements ICredentialType {
	name = 'httpBearerAuth';
	displayName = 'Bearer Auth';
	documentationUrl = 'httpRequest';
	icon = 'node:n8n-nodes-base.httpRequest';
	properties: INodeProperties[] = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];
}
