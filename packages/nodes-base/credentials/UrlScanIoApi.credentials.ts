import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class UrlScanIoApi implements ICredentialType {
	name = 'urlScanIoApi';
	displayName = 'urlscan.io API';
	documentationUrl = 'urlScanIo';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			required: true,
		},
	];
}
