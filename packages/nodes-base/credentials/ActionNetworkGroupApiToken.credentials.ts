import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ActionNetworkGroupApiToken implements ICredentialType {
	name = 'ActionNetworkGroupApiToken';
	displayName = 'Action Network API';
	properties = [
		{
			displayName: 'OSDI API Token',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
