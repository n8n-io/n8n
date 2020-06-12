import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class SpotifyOAuth2Api implements ICredentialType {
	name = 'spotifyOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Spotify OAuth2 API';
	properties = [
		{
			displayName: 'Spotify Server',
			name: 'server',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.spotify.com/',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://accounts.spotify.com/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://accounts.spotify.com/api/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: 'user-read-playback-state playlist-read-collaborative user-modify-playback-state playlist-modify-public user-read-currently-playing playlist-read-private user-read-recently-played playlist-modify-private',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'header',
        }
	];
}
