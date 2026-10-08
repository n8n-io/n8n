import { googleServiceAccountProperties } from 'n8n-nodes-base/google-service-account';
import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class GoogleVertexAiApi implements ICredentialType {
	name = 'googleVertexAiApi';

	displayName = 'Google Vertex AI';

	documentationUrl = 'google/service-account';

	icon: Icon = 'file:icons/google.svg';

	properties: INodeProperties[] = [
		...googleServiceAccountProperties,
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
