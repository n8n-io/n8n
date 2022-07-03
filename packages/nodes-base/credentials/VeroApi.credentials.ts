import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class VeroApi implements ICredentialType {
	name = 'veroApi';
	displayName = 'Vero API';
	documentationUrl = 'vero';
	properties: INodeProperties[] = [
		{
			displayName: 'Auth Token',
			name: 'authToken',
			type: 'string',
			default: '',
		},
	];
}
