import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

// Window operations hit the v1 REST API on the Airtop host. Relative endpoints in
// the node resolve against BASE_URL = https://api.airtop.ai/api/v1 (see transport/index.ts).
const AIRTOP_BASE_URL = 'https://api.airtop.ai';
const API_V1 = '/api/v1';

describe('Test Airtop, window workflows', () => {
	afterEach(() => nock.cleanAll());

	describe('Get Live View returns the window info merged with the session and window IDs', () => {
		beforeAll(() => {
			// No `.query(...)`: with Additional Fields left empty the node must send a bare GET,
			// so this interceptor only matches when no query string is present.
			nock(AIRTOP_BASE_URL)
				.get(`${API_V1}/sessions/test-session-123/windows/test-window-123`)
				.reply(200, {
					data: {
						windowId: 'test-window-123',
						liveViewUrl: 'https://portal.airtop.ai/live-view/test-window-123',
					},
				});
		});

		new NodeTestHarness().setupTests({ workflowFiles: ['windowGetLiveView.workflow.json'] });
	});

	describe('List Windows returns the windows array merged with the session ID', () => {
		beforeAll(() => {
			nock(AIRTOP_BASE_URL)
				.get(`${API_V1}/sessions/test-session-123/windows`)
				.reply(200, {
					data: {
						windows: [{ windowId: 'test-window-123' }],
					},
				});
		});

		new NodeTestHarness().setupTests({ workflowFiles: ['windowList.workflow.json'] });
	});
});
