import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SmartSheetAPI implements ICredentialType {
	name = 'smartSheetApi';
	displayName = 'SmartSheet API';
    documentationUrl = 'smartSheet';
	properties = [
		{
			displayName: 'API KEY',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
            default: '',
		},
	];
}

