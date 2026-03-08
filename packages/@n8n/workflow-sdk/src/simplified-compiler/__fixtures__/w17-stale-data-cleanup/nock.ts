import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /items?status=stale → stale items list
	const s1 = nock('https://api.app.com')
		.get('/items?status=stale')
		.reply(200, [
			{ id: 101, name: 'Old Campaign', status: 'stale', lastAccessed: '2023-06-15' },
			{ id: 202, name: 'Expired Report', status: 'stale', lastAccessed: '2023-05-01' },
		]);

	// DELETE /items/:id → per-loop deletion with item.id in URL
	const s2 = nock('https://api.app.com')
		.delete('/items/101')
		.reply(200, { deleted: true, id: 101 });

	const s3 = nock('https://api.app.com')
		.delete('/items/202')
		.reply(200, { deleted: true, id: 202 });

	return [s1, s2, s3];
}
