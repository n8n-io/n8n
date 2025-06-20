import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class EmailVerifyIoApi implements ICredentialType {
	name = 'emailVerifyIoApi';

	displayName = 'EmailVerify.io API';

	documentationUrl = 'emailverifyio';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
