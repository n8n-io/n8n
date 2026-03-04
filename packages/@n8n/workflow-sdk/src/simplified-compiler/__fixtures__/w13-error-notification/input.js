onError(async ({ error, workflow }) => {
	await http.post(
		'https://api.pagerduty.com/incidents',
		{
			incident: {
				title: 'Workflow error detected',
				body: { type: 'incident_body', details: 'An error occurred' },
			},
		},
		{ auth: { type: 'basic', credential: 'PagerDuty' } },
	);
});
