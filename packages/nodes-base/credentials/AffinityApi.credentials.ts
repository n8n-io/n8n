import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class AffinityApi implements ICredentialType {
	name = 'affinityApi';
	displayName = 'Affinity API';
	documentationUrl = 'affinity';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
