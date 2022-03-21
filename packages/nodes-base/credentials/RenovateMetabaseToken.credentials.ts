import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class RenovateMetabaseToken implements ICredentialType {
	name = 'renovateMetabaseToken';
	displayName = 'Renovate Metabase Token';
	documentationUrl = '';
	properties: INodeProperties[] = [
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			default: '',
		},
	];
}
