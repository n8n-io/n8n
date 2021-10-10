import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class UProcApi implements ICredentialType {
	name = 'uprocApi';
	displayName = 'uProc API';
	documentationUrl = 'uProc';
	properties: INodeProperties[] = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
