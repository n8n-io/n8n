import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class HasuraApi implements ICredentialType {
	name = 'hasuraApi';
	displayName = 'Hasura API';
	documentationUrl = '';
	properties = [
		{
			displayName: 'API Host',
			name: 'apiHost',
			type: 'string' as NodePropertyTypes,
			default: 'localhost:8083',
		},
	];
}
