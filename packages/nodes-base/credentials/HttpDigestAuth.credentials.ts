import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class HttpDigestAuth implements ICredentialType {
	name = 'httpDigestAuth';
	displayName = 'Digest Auth';
	documentationUrl = 'httpRequest';
	icon = 'node:n8n-nodes-base.httpRequest';
	properties: INodeProperties[] = [
		{
			displayName: 'User',
			name: 'user',
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
	];
}
