/** @example [{ body: { meetingTitle: "Q3 Planning", meetingNotes: "Discussed roadmap priorities and budget allocation" } }] */
onWebhook({ method: 'POST', path: '/google-meet-automation' }, async ({ body, respond }) => {
	if (!body.meetingTitle || !body.meetingNotes) {
		respond({ status: 400, body: { status: 'error', message: 'Missing required fields' } });
		return;
	}

	const meeting = {
		notes: body.meetingNotes,
		title: body.meetingTitle,
	};

	/** @example [{ action_items: [{ description: "Review Q3 budget" }, { description: "Update roadmap" }], follow_up_emails: [{ recipient: "team@company.com", subject: "Meeting Action Items" }], summary: "Discussed Q3 priorities and roadmap updates" }] */
	const analysis = await new Agent({
		prompt: 'Analyze these meeting notes',
		model: new GoogleGeminiModel({ modelName: 'gemini-pro' }),
		outputParser: new StructuredOutputParser({
			schemaType: 'fromJson',
			jsonSchemaExample: '{"action_items":"array","follow_up_emails":"array","summary":"string"}',
		}),
	}).chat();

	for (const item of analysis.action_items) {
		await http.post(
			'https://tasks.googleapis.com/tasks/v1/lists/TASKLIST/tasks',
			{
				title: item.description,
			},
			{ auth: { type: 'oauth2', credential: 'Google Tasks' } },
		);
	}

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

	await http.post(
		'https://docs.googleapis.com/v1/documents',
		{
			title: 'Meeting Summary',
		},
		{ auth: { type: 'oauth2', credential: 'Google Docs' } },
	);

	respond({ status: 200, body: { status: 'success' } });
});
