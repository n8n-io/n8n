import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class OnOfficeApi implements ICredentialType {
	name = 'onOfficeApi';
	displayName = 'OnOffice API';
	documentationUrl = 'onOffice';
	properties = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: '3s9a23a83485342665e12cd518075e03',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: '0fdeeb608cdadf11cbed6c1ee58aa68b2f1601507b334bb4c25699265dca57aa',
		},
	];
}
