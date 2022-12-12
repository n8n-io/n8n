import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class PlivoApi implements ICredentialType {
	name = 'plivoApi';

	displayName = 'Plivo API';

	documentationUrl = 'plivo';

	properties: INodeProperties[] = [
		{
			displayName: 'Auth ID',
			name: 'authId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Auth Token',
			name: 'authToken',
			type: 'string',
			default: '',
		},
	];
}
