import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ZoomApi implements ICredentialType {
	name = 'zoomApi';
	displayName = 'Zoom API';
	documentationUrl = 'zoom';
	properties: INodeProperties[] = [
		{
			displayName: 'JWT Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	];
}
