import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// POST /grades — only the grade-A branch executes (score=95 > 90)
	const s1 = nock('https://api.example.com')
		.post('/grades')
		.reply(200, { success: true, grade: 'A' });

	return [s1];
}
