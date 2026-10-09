import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class GoogleVertexAiApi implements ICredentialType {
	name = 'googleVertexAiApi';

	extends = ['googleApi'];

	displayName = 'Google Vertex AI';

	documentationUrl = 'google/service-account';

	icon: Icon = 'file:icons/google.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Project ID',
			name: 'projectId',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'my-project-id',
			description: 'Google Cloud project to use with Vertex AI',
		},
		// Hide inherited settings that the Vertex AI client does not use.
		{
			displayName: 'Impersonate a User',
			name: 'inpersonate',
			type: 'hidden',
			default: false,
		},
		{
			displayName: 'Email',
			name: 'delegatedEmail',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Set up for use in HTTP Request node',
			name: 'httpNode',
			type: 'hidden',
			default: false,
		},
		{
			displayName: 'HTTP Request Warning',
			name: 'httpWarning',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Scope(s)',
			name: 'scopes',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Allowed HTTP Request Domains',
			name: 'allowedHttpRequestDomains',
			type: 'hidden',
			default: 'all',
		},
		{
			displayName: 'Allowed Domains',
			name: 'allowedDomains',
			type: 'hidden',
			default: '',
		},
	];
}
