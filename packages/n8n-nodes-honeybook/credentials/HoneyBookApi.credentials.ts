import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class HoneyBookApi implements ICredentialType {
	name = 'honeyBookApi';

	displayName = 'HoneyBook API';

	properties: INodeProperties[] = [
		{
			displayName: 'Company ID',
			name: 'company_id',
			type: 'string',
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				company_id: '={{$credentials.company_id}}',
			},
		},
	};
}
