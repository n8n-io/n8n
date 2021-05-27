import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class PhantombusterApi implements ICredentialType {
	name = 'phantombusterApi';
	displayName = 'Phantombuster API';
	documentationUrl = 'phantombuster';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
