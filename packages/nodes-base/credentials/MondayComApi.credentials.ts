import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MondayComApi implements ICredentialType {
	name = 'mondayComApi';
	displayName = 'Monday.com API';
	documentationUrl = 'mondayCom';
	properties: INodeProperties[] = [
		{
			displayName: 'Token V2',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
	];
}
