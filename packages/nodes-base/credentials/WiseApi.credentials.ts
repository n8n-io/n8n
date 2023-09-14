import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class WiseApi implements ICredentialType {
	name = 'wiseApi';

	displayName = 'Wise API';

	documentationUrl = 'wise';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			default: 'live',
			options: [
				{
					name: 'Live',
					value: 'live',
				},
				{
					name: 'Test',
					value: 'test',
				},
			],
		},
		{
			displayName: 'Private Key (Optional)',
			name: 'privateKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Optional private key used for Strong Customer Authentication (SCA). Only needed to retrieve statements, and execute transfers.',
		},
	];
}
