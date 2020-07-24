import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class NextCloudApi implements ICredentialType {
	name = 'nextCloudApi';
	displayName = 'NextCloud API';
	properties = [
		{
			displayName: 'Web DAV URL',
			name: 'webDavUrl',
			type: 'string' as NodePropertyTypes,
			placeholder: 'https://nextcloud.example.com/remote.php/webdav',
			default: '',
		},
		{
			displayName: 'User',
			name: 'user',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
