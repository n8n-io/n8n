import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class JenkinsApi implements ICredentialType {
	name = 'JenkinsApi';
	displayName = 'Jenkins API';
	documentationUrl = 'Jenkins';
	properties: INodeProperties[] = [
		{
			displayName: 'Personal API Token',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
