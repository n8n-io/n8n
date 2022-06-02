import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class LaMetric implements ICredentialType {
	name = 'laMetric';
	displayName = 'LaMetric';
	documentationUrl = 'laMetric';
	properties: INodeProperties[] = [
		{
			displayName: 'Device URL',
			name: 'deviceUrl',
			type: 'string',
			default: '',
			placeholder: 'http://192.168.0.239:8080'
		},
		{
			displayName: 'Api Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: 'dev',
		}
	];
}
