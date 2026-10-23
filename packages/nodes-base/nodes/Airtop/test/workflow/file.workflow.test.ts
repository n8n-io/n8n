import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

// File operations hit the v1 REST API on the Airtop host, plus an SSE events stream
// used to wait for the file to become available in the session.
const AIRTOP_BASE_URL = 'https://api.airtop.ai';
const API_V1 = '/api/v1';

// Server-sent-event payload the node parses to learn the file is ready in the session.
// waitForSessionEvent() reads the `data:` line and matches on fileId + event + status.
const FILE_AVAILABLE_EVENT =
	'data: {"event":"file_upload_status","status":"available","fileId":"file-123"}\n\n';

describe('Test Airtop, file workflows', () => {
	afterEach(() => nock.cleanAll());

	describe('Load a file pushes it to the session, waits for the ready event, then triggers the file input', () => {
		beforeAll(() => {
			// 1. Associate the existing file with the session.
			nock(AIRTOP_BASE_URL)
				.post(`${API_V1}/files/file-123/push`, { sessionIds: ['test-session-123'] })
				.reply(200, {});
			// 2. SSE stream: reply with a single "available" event so the wait resolves immediately.
			nock(AIRTOP_BASE_URL)
				.get(`${API_V1}/sessions/test-session-123/events`)
				.query({ all: 'true' })
				.reply(200, FILE_AVAILABLE_EVENT);
			// 3. Trigger the file input in the target window.
			nock(AIRTOP_BASE_URL)
				.post(`${API_V1}/sessions/test-session-123/windows/test-window-123/file-input`, {
					fileId: 'file-123',
					elementDescription: 'the file upload box',
					includeHiddenElements: true,
				})
				.reply(200, {});
		});

		new NodeTestHarness().setupTests({ workflowFiles: ['fileLoad.workflow.json'] });
	});

	describe('Upload a file fetches the source, creates and uploads it, then loads it into the session', () => {
		beforeAll(() => {
			// 1. Fetch the source file (returned as a binary buffer).
			nock('https://example.com').get('/file.pdf').reply(200, Buffer.from('file-content'));
			// 2. Create the file entry; the response carries the id and the upload URL.
			nock(AIRTOP_BASE_URL)
				.post(`${API_V1}/files`, { fileName: 'test.pdf', fileType: 'customer_upload' })
				.reply(200, {
					data: { id: 'file-123', uploadUrl: 'https://upload.airtop.ai/files/file-123' },
				});
			// 3. Upload the file content to the pre-signed URL.
			nock('https://upload.airtop.ai').put('/files/file-123').reply(200, {});
			// 4. Poll until the created file is available (resolves on the first poll).
			nock(AIRTOP_BASE_URL)
				.get(`${API_V1}/files/file-123`)
				.reply(200, { data: { status: 'available' } });
			// 5. Associate the file with the session.
			nock(AIRTOP_BASE_URL)
				.post(`${API_V1}/files/file-123/push`, { sessionIds: ['test-session-123'] })
				.reply(200, {});
			// 6. SSE stream: reply with a single "available" event so the wait resolves immediately.
			nock(AIRTOP_BASE_URL)
				.get(`${API_V1}/sessions/test-session-123/events`)
				.query({ all: 'true' })
				.reply(200, FILE_AVAILABLE_EVENT);
			// 7. Trigger the file input in the target window.
			nock(AIRTOP_BASE_URL)
				.post(`${API_V1}/sessions/test-session-123/windows/test-window-123/file-input`, {
					fileId: 'file-123',
					elementDescription: 'the file upload box',
					includeHiddenElements: true,
				})
				.reply(200, {});
		});

		new NodeTestHarness().setupTests({ workflowFiles: ['fileUpload.workflow.json'] });
	});
});
