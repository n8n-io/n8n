import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// POST /api/calls → Ultravox call session creation
	const s1 = nock('https://api.ultravox.ai').post('/api/calls').reply(201, {
		callId: 'call_abc123',
		joinUrl: 'wss://voice.ultravox.ai/session/abc123',
		status: 'created',
	});

	return [s1];
}
