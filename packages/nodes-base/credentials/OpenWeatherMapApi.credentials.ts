import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class OpenWeatherMapApi implements ICredentialType {
	name = 'openWeatherMapApi';
	displayName = 'OpenWeatherMap API';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
