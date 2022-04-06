import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Magento2Api implements ICredentialType {
	name = 'magento2Api';
	displayName = 'Magento 2 API';
	documentationUrl = 'magento2';
	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	];
}
