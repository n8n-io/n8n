import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class CustomerIoApi implements ICredentialType {
	name = 'customerIoApi';
	displayName = 'Customer.io API';
	properties = [
		{
			displayName: 'App API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true
		},
		{
			displayName: 'Site ID',
			name: 'siteId',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'Optional credential, used only if calling the tracking API.'
		},
	];
}
