import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// PATCH /posts/update → approve branch (triggered by pin data: action="approve")
	const s1 = nock('https://api.cms.com')
		.patch('/posts/update')
		.reply(200, { id: 'post_789', status: 'published', updatedAt: '2024-01-15T10:00:00Z' });

	// DELETE /posts/remove → reject branch (won't execute with current pin data)
	const s2 = nock('https://api.cms.com').delete('/posts/remove').reply(200, { deleted: true });

	// POST /escalations → escalate branch (won't execute)
	const s3 = nock('https://api.cms.com')
		.post('/escalations')
		.reply(200, { id: 'esc_001', status: 'pending_review' });

	return [s1, s2, s3];
}
