onSchedule({ every: '1h' }, async () => {
	/** @example [{ id: "msg_001", threadId: "thread_001", labelIds: ["UNREAD", "INBOX"] }] */
	const emails = await http.get(
		'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread',
		{ auth: { type: 'oauth2', credential: 'Gmail' } },
	);

	/** @example [{ is_invoice: true, due_date: "2024-03-15", amount_due: 1500.00, sender: "vendor@company.com", subject: "Invoice #INV-2024-0042" }] */
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
