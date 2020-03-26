import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class MondayApi implements ICredentialType {
	name = 'mondayApi';
	displayName = 'Monday.com API';
	properties = [
		{
			displayName: 'Token V2',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
