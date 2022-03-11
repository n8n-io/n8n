import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GrafanaApi implements ICredentialType {
	name = 'grafanaApi';
	displayName = 'Grafana API';
	documentationUrl = 'grafana';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			description: 'Base URL of your Grafana instance',
			placeholder: 'e.g. https://n8n.grafana.net/',
			required: true,
		},
	];
}
