import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// POST /bot/sendMessage → text echo branch (triggered when voice is null)
	const s1 = nock('https://api.telegram.org')
		.post('/bot/sendMessage')
		.reply(200, { ok: true, result: { message_id: 456, chat: { id: 123456 } } });

	// GET /bot/getFile → voice branch (won't execute with current pin data: voice=null)
	const s2 = nock('https://api.telegram.org')
		.get('/bot/getFile')
		.reply(200, { ok: true, result: { file_path: 'voice/file_123.ogg' } });

	// POST /v1/audio/transcriptions → voice branch (won't execute)
	const s3 = nock('https://api.openai.com')
		.post('/v1/audio/transcriptions')
		.reply(200, { text: 'Hello, this is a test transcription' });

	// POST /bot/sendMessage → voice branch reply (won't execute)
	const s4 = nock('https://api.telegram.org')
		.post('/bot/sendMessage')
		.reply(200, { ok: true, result: { message_id: 457, chat: { id: 123456 } } });

	return [s1, s2, s3, s4];
}
