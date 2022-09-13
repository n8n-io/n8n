import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AffinityApi implements ICredentialType {
	name = 'affinityApi';
	displayName = 'Affinity API';
	documentationUrl = 'affinity';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
