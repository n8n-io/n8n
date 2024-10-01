import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export type LanceDbApiCredentials =
	| {
			connectionType: 'localFile';
			fileName: string;
	  }
	| {
			connectionType: 'cloudHosted';
			dbUri: string;
			apiKey: string;
	  };

export class LanceDbApi implements ICredentialType {
	name = 'lanceDbApi';

	displayName = 'LanceDB API';

	documentationUrl = 'lancedb';

	properties: INodeProperties[] = [
		{
			displayName: 'Connection Type',
			name: 'connectionType',
			type: 'options',
			default: 'cloudHosted',
			options: [
				{
					name: 'Local File',
					value: 'localFile',
				},
				{
					name: 'LanceDB Cloud',
					value: 'cloudHosted',
				},
			],
			description: 'Select whether to connect to a local LanceDB file or LanceDB Cloud.',
		},
		{
			displayName: 'File Name',
			name: 'fileName',
			type: 'string',
			default: 'vector-store.db',
			required: true,
			displayOptions: {
				show: {
					connectionType: ['localFile'],
				},
			},
			description: 'The name of the local LanceDB file (e.g., "my-database.db").',
		},
		{
			displayName: 'Database URI',
			name: 'dbUri',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					connectionType: ['cloudHosted'],
				},
			},
			description: 'The full URI for your LanceDB Cloud database.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			displayOptions: {
				show: {
					connectionType: ['cloudHosted'],
				},
			},
			description: 'Your LanceDB Cloud API Key.',
		},
	];
}
