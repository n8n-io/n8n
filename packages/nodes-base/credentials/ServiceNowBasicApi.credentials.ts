import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ServiceNowBasicApi implements ICredentialType {
	name = 'serviceNowBasicApi';
	extends = [
		'httpBasicAuth',
	];
	displayName = 'ServiceNow Basic Auth API';
	documentationUrl = 'serviceNow';
	properties: INodeProperties[] = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
			placeholder: '<subdomain>',
			description: 'The subdomain of your ServiceNow environment',
			required: true,
		},
	];
}
