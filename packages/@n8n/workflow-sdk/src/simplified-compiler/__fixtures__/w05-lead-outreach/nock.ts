import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /v4/spreadsheets/SPREADSHEET_ID/values/Sheet1 → Google Sheets data
	const s1 = nock('https://sheets.googleapis.com')
		.get('/v4/spreadsheets/SPREADSHEET_ID/values/Sheet1')
		.reply(200, {
			values: [
				{ 0: 'John', 1: 'john@test.com', 2: 'New' },
				{ 0: 'Jane', 1: 'jane@test.com', 2: 'Contacted' },
				{ 0: 'Bob', 1: 'bob@test.com', 2: 'New' },
			],
		});

	// POST /gmail/v1/users/me/messages/send → per-loop email send
	const s2 = nock('https://gmail.googleapis.com')
		.post('/gmail/v1/users/me/messages/send')
		.reply(200, { id: 'msg_001', threadId: 'thread_001' })
		.persist();

	// PUT /v4/spreadsheets/SPREADSHEET_ID/values/Sheet1 → per-loop status update
	const s3 = nock('https://sheets.googleapis.com')
		.put('/v4/spreadsheets/SPREADSHEET_ID/values/Sheet1')
		.reply(200, { updatedCells: 1 })
		.persist();

	return [s1, s2, s3];
}
