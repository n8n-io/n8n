/** @example [{ body: { callerId: "+15551234567", department: "support" } }] */
onWebhook({ method: 'POST', path: '/call-session' }, async ({ body, respond }) => {
	/** @example [{ callId: "call_abc123", joinUrl: "wss://voice.ultravox.ai/session/abc123", status: "created" }] */
	const session = await http.post(
		'https://api.ultravox.ai/api/calls',
		{
			voice: 'c2c5cce4-72ec-4d8b-8cdb-f8a0f6610bd1',
			medium: { plivo: {} },
			systemPrompt: 'You are a voice assistant for the clinic...',
		},
		{ auth: { type: 'bearer', credential: 'UltraVox API' } },
	);

	/** @example [{ success: true }] */
	respond({
		status: 200,
		headers: { 'Content-Type': 'text/xml' },
		body: '<Response><Stream keepCallAlive="true">joinUrl</Stream></Response>',
	});
});
