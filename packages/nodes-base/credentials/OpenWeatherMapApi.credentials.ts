import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class OpenWeatherMapApi implements ICredentialType {
	name = 'openWeatherMapApi';
	displayName = 'OpenWeatherMap API';
	documentationUrl = 'openWeatherMap';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	];
}
