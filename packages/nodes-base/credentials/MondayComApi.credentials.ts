import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class MondayComApi implements ICredentialType {
	name = 'mondayComApi';
	displayName = 'Monday.com API';
	documentationUrl = 'mondayCom';
	properties = [
		{
			displayName: 'Token V2',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
