import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class TwakeApi implements ICredentialType {
	name = 'twakeApi';
	displayName = 'Twake';
	properties = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
		{
			displayName: 'SaaS version',
			name: 'useInSaas',
			type: 'boolean' as NodePropertyTypes,
			default: true,
		},
		{
			displayName: 'Host url',
			name: 'host',
			type: 'string' as NodePropertyTypes,
			default: "",
			displayOptions: {
				show: {
					["useInSaas"]: [false],
				},
			},
		},
		{
			displayName: 'Workspace Key',
			name: 'key',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
