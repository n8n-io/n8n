onWebhook({ method: 'POST', path: '/call-session' }, async ({ body, respond }) => {
	const session = await http.post(
		'https://api.ultravox.ai/api/calls',
		{
			voice: 'c2c5cce4-72ec-4d8b-8cdb-f8a0f6610bd1',
			medium: { plivo: {} },
			systemPrompt: 'You are a voice assistant for the clinic...',
		},
		{ auth: { type: 'bearer', credential: 'UltraVox API' } },
	);

	respond({
		status: 200,
		headers: { 'Content-Type': 'text/xml' },
		body: '<Response><Stream keepCallAlive="true">joinUrl</Stream></Response>',
	});
});
