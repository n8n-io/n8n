import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

import { GOOGLE_VERTEX_CUSTOM_PROJECT, searchGoogleProjects } from '../utils/google-vertex';

export class GoogleVertexAiApi implements ICredentialType {
	name = 'googleVertexAiApi';

	extends = ['googleApi'];

	displayName = 'Google Vertex AI';

	documentationUrl = 'google/service-account';

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
	];

	methods = { loadOptions: { gcpProjectsList: searchGoogleProjects } };
}
