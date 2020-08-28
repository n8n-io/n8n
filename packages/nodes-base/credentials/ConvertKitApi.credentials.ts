import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class ConvertKitApi implements ICredentialType {
	name = 'convertKitApi';
	displayName = 'ConvertKit API';
	properties = [
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];
}
