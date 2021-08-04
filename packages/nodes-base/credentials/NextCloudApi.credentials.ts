import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class NextCloudApi implements ICredentialType {
	name = 'nextCloudApi';
	displayName = 'NextCloud API';
	documentationUrl = 'nextCloud';
	properties: INodeProperties[] = [
		{
			displayName: 'Web DAV URL',
			name: 'webDavUrl',
			type: 'string',
			placeholder: 'https://nextcloud.example.com/remote.php/webdav',
			default: '',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			default: '',
		},
	];
}
