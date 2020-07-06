import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class ZoomApi implements ICredentialType {
	name = 'zoomApi';
	displayName = 'Zoom API';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: ''
		}
	];
}
