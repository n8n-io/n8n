import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TotpApi implements ICredentialType {
	name = 'totpApi';

	displayName = 'TOTP API';

	documentationUrl = 'totp'; // @TODO

	properties: INodeProperties[] = [
		{
			displayName: 'Secret',
			name: 'secret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Label',
			name: 'label',
			type: 'string',
			default: '',
			placeholder: 'e.g. GitHub:john-doe',
		},
	];
}
