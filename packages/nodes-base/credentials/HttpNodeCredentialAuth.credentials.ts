import {
	ICredentialType, ILoadOptionsFunctions,
	INodeProperties, INodePropertyOptions,
} from 'n8n-workflow';


export class HttpNodeCredentialAuth implements ICredentialType {
	name = 'httpNodeCredentialAuth';
	displayName = 'Node Credential Type';
	documentationUrl = 'httpRequest';
	icon = 'node:n8n-nodes-base.httpRequest';
	properties: INodeProperties[] = [
		{
			displayName: 'Node Credential Type',
			name: 'type',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getNodeCredentialTypes',
			},
			options: [],
			default: '',
			description: 'The node credential type.',
		},
	];
}
