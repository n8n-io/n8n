import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class TapfiliateApi implements ICredentialType {
	name = 'tapfiliateApi';
	displayName = 'Tapfiliate API';
	documentationUrl = 'tapfiliate';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
