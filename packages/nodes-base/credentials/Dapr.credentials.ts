import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Dapr implements ICredentialType {
	name = 'dapr';
	displayName = 'Dapr';
	documentationUrl = 'dapr';
	properties: INodeProperties[] = [
		{
			displayName: 'Dapr host',
			name: 'daprHost',
			type: 'string',
			default: '127.0.0.1',
			required: true,
			description: 'Dapr Sidecar Host.',
		},
		{
			displayName: 'Dapr port',
			name: 'daprPort',
			type: 'string',
			default: '3500',
			required: true,
			description: 'Dapr Sidecar Port.',
		},
		{
			displayName: 'Dapr API token',
			name: 'daprApiToken',
			type: 'string',
			default: '',
		}
	]
}
