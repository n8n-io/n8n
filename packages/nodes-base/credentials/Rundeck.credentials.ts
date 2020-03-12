import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class Rundeck implements ICredentialType {
	name = 'rundeck';
	displayName = 'Rundeck';
	properties = [
		{
			displayName: 'Url',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Api Version',
			name: 'apiVersion',
			type: 'number' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Token',
			name: 'token',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
