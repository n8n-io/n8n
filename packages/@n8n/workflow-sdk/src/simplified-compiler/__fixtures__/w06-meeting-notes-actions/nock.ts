import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// POST /tasks → per action_item loop iteration (AI pin data has 2 action_items)
	const s1 = nock('https://tasks.googleapis.com')
		.post('/tasks/v1/lists/TASKLIST/tasks')
		.reply(200, {
			kind: 'tasks#task',
			id: 'task_001',
			title: 'Review Q3 budget',
			status: 'needsAction',
		})
		.persist();

	// POST /gmail → per follow_up_email loop iteration (AI pin data has 1 email)
	const s2 = nock('https://gmail.googleapis.com')
		.post('/gmail/v1/users/me/messages/send')
		.reply(200, { id: 'msg_001', threadId: 'thread_001' })
		.persist();

	// POST /documents → single call after loops
	const s3 = nock('https://docs.googleapis.com')
		.post('/v1/documents')
		.reply(200, { documentId: 'doc_001', title: 'Meeting Summary' });

	return [s1, s2, s3];
}
