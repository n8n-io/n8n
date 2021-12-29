import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WorkableApi implements ICredentialType {
	name = 'workableApi';
	displayName = 'Workable API';
	documentationUrl = 'workable';
	properties: INodeProperties[] = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	];
}
