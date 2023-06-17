import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MatrixApi implements ICredentialType {
	name = 'matrixApi';

	displayName = 'Matrix API';

	documentationUrl = 'matrix';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Homeserver URL',
			name: 'homeserverUrl',
			type: 'string',
			default: 'https://matrix-client.matrix.org',
		},
	];
}
