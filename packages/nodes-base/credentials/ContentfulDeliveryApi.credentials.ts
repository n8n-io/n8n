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
			description: 'The id for the Cotentful space.'
		},
		{
			displayName: 'Access Token',
			name: 'access_token',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'Access token that has access to the space'
		}
	];
}
