import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CalendlyV2Api implements ICredentialType {
	name = 'calendlyV2Api';
	displayName = 'Calendly API';
	documentationUrl = 'calendly';
	properties: INodeProperties[] = [
		{
			displayName: 'Personal Access Token',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}