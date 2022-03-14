import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class SpotifyOAuth2Api implements ICredentialType {
	name = 'spotifyOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Spotify OAuth2 API';
	documentationUrl = 'spotify';
	properties: INodeProperties[] = [
		{
			displayName: 'Spotify Server',
			name: 'server',
			type: 'hidden',
			default: 'https://api.spotify.com/',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://accounts.spotify.com/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://accounts.spotify.com/api/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'user-read-playback-state playlist-read-collaborative user-modify-playback-state playlist-modify-public user-read-currently-playing playlist-read-private user-read-recently-played playlist-modify-private user-library-read user-follow-read',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
