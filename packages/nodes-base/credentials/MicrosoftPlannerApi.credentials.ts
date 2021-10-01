import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MicrosoftPlannerApi implements ICredentialType {
	name = 'microsoftPlannerApi';
	displayName = 'Service Account API';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			required: true,
		},
	];
}
