import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class TypeformApi implements ICredentialType {
	name = 'typeformApi';
	displayName = 'Typeform API';
	documentationUrl = 'typeform';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	];
}
