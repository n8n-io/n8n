import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

import { GOOGLE_VERTEX_CUSTOM_PROJECT, searchGoogleProjects } from '../utils/google-vertex';

export class GoogleVertexAiApi implements ICredentialType {
	name = 'googleVertexAiApi';

	extends = ['googleApi'];

	displayName = 'Google Vertex AI';

	documentationUrl = 'googlevertexai';

	icon: Icon = 'file:icons/google.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Project',
			name: 'project',
			type: 'options',
			options: [{ name: 'Custom', value: GOOGLE_VERTEX_CUSTOM_PROJECT }],
			default: GOOGLE_VERTEX_CUSTOM_PROJECT,
			required: true,
			description: 'Select a Google Cloud project, or select Custom to enter a project ID',
			typeOptions: {
				loadOptionsMethod: 'gcpProjectsList',
				loadOptionsDependsOn: ['email', 'privateKey'],
			},
		},
		{
			displayName: 'Project ID',
			name: 'projectId',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'my-project-id',
			description: 'Google Cloud project to use with Vertex AI',
			displayOptions: { show: { project: [GOOGLE_VERTEX_CUSTOM_PROJECT] } },
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

	methods = { loadOptions: { gcpProjectsList: searchGoogleProjects } };
}
