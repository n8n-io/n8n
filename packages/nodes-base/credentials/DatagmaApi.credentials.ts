import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class DatagmaApi implements ICredentialType {
	name = 'datagmaApi';
	displayName = 'Datagma API';
	documentationUrl = 'datagma';
	properties = [
			{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string' as NodePropertyTypes,
					default: '',
			},
	];
}
