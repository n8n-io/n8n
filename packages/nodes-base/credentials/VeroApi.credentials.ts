import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class VeroApi implements ICredentialType {
	name = 'veroApi';
	displayName = 'Vero API';
	documentationUrl = 'vero';
	properties = [
		{
			displayName: 'Auth Token',
			name: 'authToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
