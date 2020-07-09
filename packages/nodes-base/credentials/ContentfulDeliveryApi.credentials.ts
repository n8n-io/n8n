import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class ContentfulDeliveryApi implements ICredentialType {
	name = 'contentfulDeliveryApi';
	displayName = 'Delivery API';
	properties = [
		{
			displayName: 'Space Id',
			name: 'space_id',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
			description: 'The id for the Contentful space.'
		},
		{
			displayName: 'Content Delivery API - access token',
			name: 'access_token',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
			description: 'Access token that has access to the space'
		},
		{
			displayName: 'Content Preview API - access token',
			name: 'access_token_preview',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'Access token that has access to the space'
		}
	];
}
