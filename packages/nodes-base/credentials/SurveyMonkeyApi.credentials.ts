import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SurveyMonkeyApi implements ICredentialType {
	name = 'surveyMonkeyApi';
	displayName = 'SurveyMonkey API';
	documentationUrl = 'surveyMonkey';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: `The access token must have the following scopes:
			<ul>
				<li>Create/modify webhooks</li>
				<li>View webhooks</li>
				<li>View surveys</li>
				<li>View collectors</li>
				<li>View responses</li>
				<li>View response details</li>
			</ul>`,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			default: '',
		},
	];
}
