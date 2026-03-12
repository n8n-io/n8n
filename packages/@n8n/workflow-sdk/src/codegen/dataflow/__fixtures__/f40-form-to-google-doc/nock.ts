import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const batchUpdate = nock('https://docs.googleapis.com')
		.post(/\/v1\/documents\/.*:batchUpdate/)
		.reply(200, { documentId: 'doc-abc-123', replies: [{}] });
	return [batchUpdate];
}
