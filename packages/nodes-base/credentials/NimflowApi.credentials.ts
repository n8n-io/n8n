import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class NimflowApi implements ICredentialType {
	name = 'nimflowApi';
	displayName = 'Nimflow API';
	documentationUrl = 'nimflow';
	properties = [
			{
					displayName: 'Subscription Key',
					name: 'subscriptionKey',
					type: 'string' as NodePropertyTypes,
					default: '',
			},
			{
				displayName: 'Unit Id',
				name: 'unitId',
				type: 'string' as NodePropertyTypes,
				default: '',
			},
			{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string' as NodePropertyTypes,
					default: '',
			},
	];
}
