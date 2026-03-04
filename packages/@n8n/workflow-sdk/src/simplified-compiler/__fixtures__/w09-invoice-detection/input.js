onSchedule({ every: '1h' }, async () => {
	const emails = await http.get(
		'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread',
		{ auth: { type: 'oauth2', credential: 'Gmail' } },
	);

	// @onError continue
	const analysis = await ai.chat(
		'gpt-4o',
		'Determine if this email is invoice-related. Return valid JSON.',
		{
			outputParser: {
				type: 'structured',
				schema: {
					is_invoice: 'boolean',
					due_date: 'string',
					amount_due: 'number',
					sender: 'string',
					subject: 'string',
				},
			},
		},
	);

	if (analysis.is_invoice) {
		await http.post(
			'https://slack.com/api/chat.postMessage',
			{
				text: 'Invoice detected',
				channel: '@user',
			},
			{ auth: { type: 'oauth2', credential: 'Slack' } },
		);
	}
});
