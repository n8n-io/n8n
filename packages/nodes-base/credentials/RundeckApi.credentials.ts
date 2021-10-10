import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class RundeckApi implements ICredentialType {
	name = 'rundeckApi';
	displayName = 'Rundeck API';
	documentationUrl = 'rundeck';
	properties: INodeProperties[] = [
		{
			displayName: 'Url',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'http://127.0.0.1:4440',
		},
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			default: '',
		},
	];
}
