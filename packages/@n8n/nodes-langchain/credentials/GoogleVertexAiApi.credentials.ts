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
	];
}
