import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class DriftApi implements ICredentialType {
	name = 'driftApi';
	displayName = 'Drift API';
	documentationUrl = 'drift';
	properties: INodeProperties[] = [
		{
			displayName: 'Personal Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
			description:
				'Visit your account details page, and grab the Access Token. See <a href="https://devdocs.drift.com/docs/quick-start">Drift auth</a>.',
		},
	];
}
