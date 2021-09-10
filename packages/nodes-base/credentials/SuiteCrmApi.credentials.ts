import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SuiteCrmApi implements ICredentialType {
	name = 'suiteCrmApi';
	displayName = 'Suite CRM API';
	properties = [
		{
			displayName: 'Suite CRM URL',
			name: 'suiteCrmUrl',
			type: 'string' as NodePropertyTypes,
			placeholder:'https://www.suitecrm.yourdomain.com',
			default: '',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string' as NodePropertyTypes,
			placeholder: 'c6151bf0-71ec-e14c-e927-5e7bf2fcbce6',
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			placeholder: 'hfa!mfmn213/}hio&fajkn´1123#123;132',
			default: '',
			required: true,
		},
	];
}
