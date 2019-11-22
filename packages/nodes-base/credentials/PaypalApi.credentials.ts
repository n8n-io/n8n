import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class PaypalApi implements ICredentialType {
	name = 'paypalApi';
	displayName = 'Paypal API';
	properties = [
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Secret',
			name: 'secret',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
