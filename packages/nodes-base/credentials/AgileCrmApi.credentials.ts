import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class AgileCrmApi implements ICredentialType {
	name = 'agileCrmApi';
	displayName = 'AgileCRM API';
	properties = [
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'E-Mail',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'REST API Key',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
