import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

import { searchGoogleProjects } from '../utils/google-vertex';

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
			description: 'Select or enter the Google Cloud project to use with Vertex AI',
			typeOptions: {
				loadOptionsMethod: 'gcpProjectsList',
				loadOptionsDependsOn: ['email', 'privateKey'],
			},
		},
	];

	methods = { loadOptions: { gcpProjectsList: searchGoogleProjects } };
}
