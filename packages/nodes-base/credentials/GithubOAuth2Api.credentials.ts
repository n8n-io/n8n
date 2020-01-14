import {
	ICredentialType,
} from 'n8n-workflow';


export class GithubOAuth2Api implements ICredentialType {
	name = 'githubOAuth2Api';
	// name = 'oAuth2Api/githubOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Github OAuth2 API';
	properties = [
	];
}
