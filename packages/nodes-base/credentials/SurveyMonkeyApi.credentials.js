export class SurveyMonkeyApi {
    name = 'surveyMonkeyApi';
    displayName = 'SurveyMonkey API';
    documentationUrl = 'surveymonkey';
    properties = [
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
            typeOptions: { password: true },
            default: '',
        },
    ];
}
//# sourceMappingURL=SurveyMonkeyApi.credentials.js.map