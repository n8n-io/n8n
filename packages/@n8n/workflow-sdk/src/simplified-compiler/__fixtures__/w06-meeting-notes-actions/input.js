onWebhook({ method: 'POST', path: '/google-meet-automation' }, async ({ body, respond }) => {
	if (!body.meetingTitle || !body.meetingNotes) {
		respond({ status: 400, body: { status: 'error', message: 'Missing required fields' } });
		return;
	}

	const meeting = {
		notes: body.meetingNotes,
		title: body.meetingTitle,
	};

	const analysis = await ai.chat('gemini-pro', 'Analyze these meeting notes', {
		outputParser: {
			type: 'structured',
			schema: { action_items: 'array', follow_up_emails: 'array', summary: 'string' },
		},
	});

	await Promise.all([
		(async () => {
			for (const item of analysis.action_items) {
				await http.post(
					'https://tasks.googleapis.com/tasks/v1/lists/TASKLIST/tasks',
					{
						title: item.description,
					},
					{ auth: { type: 'oauth2', credential: 'Google Tasks' } },
				);
			}
		})(),
		(async () => {
			for (const email of analysis.follow_up_emails) {
				await http.post(
					'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
					{
						to: email.recipient,
						subject: email.subject,
					},
					{ auth: { type: 'oauth2', credential: 'Gmail' } },
				);
			}
		})(),
		http.post(
			'https://docs.googleapis.com/v1/documents',
			{
				title: 'Meeting Summary',
			},
			{ auth: { type: 'oauth2', credential: 'Google Docs' } },
		),
	]);

	respond({ status: 200, body: { status: 'success' } });
});
