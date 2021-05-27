import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class UProcApi implements ICredentialType {
	name = 'uprocApi';
	displayName = 'uProc API';
	properties = [
		{
			displayName: 'Email',
			name: 'email',
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
