import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class PipedriveApi implements ICredentialType {
	name = 'pipedriveApi';
	displayName = 'Pipedrive API';
	documentationUrl = 'pipedrive';
	properties = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
