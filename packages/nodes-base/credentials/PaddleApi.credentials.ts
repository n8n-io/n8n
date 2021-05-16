import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class PaddleApi implements ICredentialType {
	name = 'paddleApi';
	displayName = 'Paddle API';
	documentationUrl = 'paddle';
	properties = [
		{
			displayName: 'Vendor Auth Code',
			name: 'vendorAuthCode',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Vendor ID',
			name: 'vendorId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Use Sandbox environment API',
			name: 'sandbox',
			type: 'boolean' as NodePropertyTypes,
			default: false,
		},
	];
}
