/** @example [{ body: { message: { chat: { id: 123456 }, text: "Hello bot", voice: null } } }] */
onWebhook({ method: 'POST', path: '/telegram-bot' }, async ({ body }) => {
	const msg = body;

	if (msg.message.text) {
		await http.post('https://api.telegram.org/bot/sendMessage', {
			chat_id: msg.message.chat.id,
			text: msg.message.text,
		});
	} else if (msg.message.voice) {
		const file = await http.get('https://api.telegram.org/bot/getFile');

		const transcription = await http.post(
			'https://api.openai.com/v1/audio/transcriptions',
			{
				file: file.result.file_path,
				model: 'whisper-1',
			},
			{ auth: { type: 'bearer', credential: 'OpenAI API' } },
		);

		await http.post('https://api.telegram.org/bot/sendMessage', {
			chat_id: msg.message.chat.id,
			text: transcription.text,
		});
	}
});
