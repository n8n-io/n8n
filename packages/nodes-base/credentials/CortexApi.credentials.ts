import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class CortexApi implements ICredentialType {
	name = 'cortexApi';
	displayName = 'Cortex API';
	properties = [
		{
			displayName: 'API Key',
			name: 'cortexApiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Cortex Instance',
			name: 'host',
			type: 'string' as NodePropertyTypes,
			description: 'The URL of the Cortex instance',
			default: '',
			placeholder: 'https://localhost:9001',
		},
	];
}
