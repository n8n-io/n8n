import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class LemlistApi implements ICredentialType {
	name = 'lemlistApi';
	displayName = 'Lemlist API';
	documentationUrl = 'lemlist';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
