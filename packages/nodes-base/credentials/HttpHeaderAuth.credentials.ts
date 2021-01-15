import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class HttpHeaderAuth implements ICredentialType {
	name = 'httpHeaderAuth';
	displayName = 'Header Auth';
	documentationUrl = 'httpRequest';
	properties = [
		{
			displayName: 'Name',
			name: 'name',
			type: 'string' as NodePropertyTypes,
			default: '',

		},
		{
			displayName: 'Value',
			name: 'value',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
