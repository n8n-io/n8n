import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BambooHRApi implements ICredentialType {
	name = 'bambooHRApi';
	displayName = 'BambooHR API';
	documentationUrl = 'bambooHR';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Company name',
			name: 'companyName',
			type: 'string',
			default: '',
		},
	];
}
