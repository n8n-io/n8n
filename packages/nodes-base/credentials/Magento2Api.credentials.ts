import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class Magento2Api implements ICredentialType {
	name = 'magento2Api';
	displayName = 'Magento 2 API';
	properties = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
