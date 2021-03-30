import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SurveyMonkeyApi implements ICredentialType {
	name = 'surveyMonkeyApi';
	displayName = 'SurveyMonkey API';
	documentationUrl = 'surveyMonkey';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: `The access token must have the following scopes:</br />
			- Create/modify webhooks</br />
			- View webhooks</br />
			- View surveys</br />
			- View collectors</br />
			- View responses<br />
			- View response details`,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
