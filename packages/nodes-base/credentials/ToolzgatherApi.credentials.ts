import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ToolzgatherApi implements ICredentialType {
	name = 'toolzgatherApi';
	displayName = 'Toolzgather API';
	documentationUrl = 'toolzgather';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
