import type { ICredentialType, INodeProperties } from 'n8n-workflow';

//https://www.contentful.com/developers/docs/references/authentication/
export class ContentfulApi implements ICredentialType {
	name = 'contentfulApi';

	displayName = 'Contenful API';

	documentationUrl = 'contentful';

	properties: INodeProperties[] = [
		{
			displayName: 'Space ID',
			name: 'spaceId',
			type: 'string',
			default: '',
			required: true,
			description: 'The ID for the Contentful space',
		},
		{
			displayName: 'Content Delivery API Access Token',
			name: 'ContentDeliveryaccessToken',
			type: 'string',
			default: '',
			description:
				'Access token that has access to the space. Can be left empty if only Delivery API should be used.',
		},
		{
			displayName: 'Content Preview API Access Token',
			name: 'ContentPreviewaccessToken',
			type: 'string',
			default: '',
			description:
				'Access token that has access to the space. Can be left empty if only Preview API should be used.',
		},
	];
}
