import {
	ICredentialType,
	INodeProperties,
	NodePropertyTypes,
} from 'n8n-workflow';

export class DolibarrApi implements ICredentialType {
	name = 'DolibarrApi';
	displayName = 'Dolibarr API';
	documentationUrl = 'Dolibarr';
	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',

		},
		{
			displayName: 'Value',
			name: 'value',
			type: 'string',
			default: '',
		},
	];
}