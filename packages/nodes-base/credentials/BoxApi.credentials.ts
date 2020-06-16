import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class BoxApi implements ICredentialType {
	name = 'boxApi';
	displayName = 'Box API';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}