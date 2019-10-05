import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class TypeformApi implements ICredentialType {
	name = 'typeformApi';
	displayName = 'Typeform API';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
