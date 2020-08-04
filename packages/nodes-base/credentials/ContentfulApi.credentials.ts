import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

//https://www.contentful.com/developers/docs/references/authentication/
export class ContentfulApi implements ICredentialType {
	name = 'contentfulApi';
	displayName = 'Contenful API';
	properties = [
		{
			displayName: 'Space ID',
			name: 'spaceId',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
			description: 'The id for the Contentful space.'
		},
		{
			displayName: 'Content Delivery API Access token',
			name: 'ContentDeliveryaccessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
			description: 'Access token that has access to the space'
		},
		{
			displayName: 'Content Preview API Access token',
			name: 'ContentPreviewaccessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
			description: 'Access token that has access to the space'
		},
	];
}
