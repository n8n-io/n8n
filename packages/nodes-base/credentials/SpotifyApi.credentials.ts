import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class SpotifyApi implements ICredentialType {
	name = 'spotifyApi';
	displayName = 'Spotify Api';
	properties = [
		{
			displayName: 'User',
			name: 'user',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
