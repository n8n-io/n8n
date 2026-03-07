import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /gmail/v1/users/me/messages?q=is:unread → Gmail message list
	const s1 = nock('https://gmail.googleapis.com')
		.get('/gmail/v1/users/me/messages?q=is:unread')
		.reply(200, [{ id: 'msg_001', threadId: 'thread_001', labelIds: ['UNREAD', 'INBOX'] }]);

	// POST /api/chat.postMessage → Slack notification (if invoice detected)
	const s2 = nock('https://slack.com')
		.post('/api/chat.postMessage')
		.reply(200, { ok: true, channel: 'C123', ts: '1234567890.123456' });

	return [s1, s2];
}
