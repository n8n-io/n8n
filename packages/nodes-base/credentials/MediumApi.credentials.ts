import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class MediumApi implements ICredentialType {
	name = 'mediumApi';
	displayName = 'Medium API';
	documentationUrl = 'medium';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
