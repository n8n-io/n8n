import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class Aws implements ICredentialType {
	name = 'aws';
	displayName = 'AWS';
	documentationUrl = 'aws';
	properties = [
		{
			displayName: 'Region',
			name: 'region',
			type: 'string' as NodePropertyTypes,
			default: 'us-east-1',
		},
		{
			displayName: 'Access Key Id',
			name: 'accessKeyId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Secret Access Key',
			name: 'secretAccessKey',
			type: 'string' as NodePropertyTypes,
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];
}
