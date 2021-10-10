import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AutomizyApi implements ICredentialType {
	name = 'automizyApi';
	displayName = 'Automizy API';
	documentationUrl = 'automizy';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
	];
}
