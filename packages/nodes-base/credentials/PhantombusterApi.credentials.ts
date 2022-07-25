import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class PhantombusterApi implements ICredentialType {
	name = 'phantombusterApi';
	displayName = 'Phantombuster API';
	documentationUrl = 'phantombuster';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
