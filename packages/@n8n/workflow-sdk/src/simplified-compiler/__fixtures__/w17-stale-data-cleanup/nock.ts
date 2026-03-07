import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /items?status=stale → stale items list
	const s1 = nock('https://api.app.com')
		.get('/items?status=stale')
		.reply(200, [
			{ id: 101, name: 'Old Campaign', status: 'stale', lastAccessed: '2023-06-15' },
			{ id: 202, name: 'Expired Report', status: 'stale', lastAccessed: '2023-05-01' },
		]);

	// DELETE /items/remove → per-loop deletion
	const s2 = nock('https://api.app.com')
		.delete('/items/remove')
		.reply(200, { deleted: true })
		.persist();

	return [s1, s2];
}
