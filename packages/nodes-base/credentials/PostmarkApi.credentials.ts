import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class PostmarkApi implements ICredentialType {
	name = 'postmarkApi';
	displayName = 'Postmark API';
	properties = [
		{
			displayName: 'Server Token',
			name: 'serverToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
