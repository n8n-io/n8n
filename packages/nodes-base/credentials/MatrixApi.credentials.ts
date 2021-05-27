import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class MatrixApi implements ICredentialType {
	name = 'matrixApi';
	displayName = 'Matrix API';
	documentationUrl = 'matrix';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Homeserver URL',
			name: 'homeserverUrl',
			type: 'string' as NodePropertyTypes,
			default: 'https://matrix-client.matrix.org',
		},
	];
}
