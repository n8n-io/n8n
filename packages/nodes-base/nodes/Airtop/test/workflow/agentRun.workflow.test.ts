import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

// Airtop splits its calls across two base paths on the same host: the v2 REST API
// (agent details) and the hooks API (webhook invocation + result polling).
const AIRTOP_BASE_URL = 'https://api.airtop.ai';
const AGENT_DETAILS_PATH = '/api/v2/agents/test-agent-123';
const AGENT_WEBHOOK_PATH = '/api/hooks/agents/test-agent-123/webhooks/test-webhook';
const AGENT_RESULT_PATH = '/api/hooks/agents/test-agent-123/invocations/invocation-123/result';

describe('Test Airtop, agent run workflow', () => {
	afterEach(() => nock.cleanAll());

	describe('sends the Browser Profile ID as a profileId query param', () => {
		beforeAll(() => {
			nock(AIRTOP_BASE_URL).get(AGENT_DETAILS_PATH).reply(200, { webhookId: 'test-webhook' });
			// nock only matches when the ?profileId= query param is present, so a green
			// test proves the selected browser profile is forwarded to the webhook.
			nock(AIRTOP_BASE_URL)
				.post(AGENT_WEBHOOK_PATH, { configVars: {} })
				.query({ profileId: 'my-profile' })
				.reply(200, { invocationId: 'invocation-123' });
		});

		new NodeTestHarness().setupTests({ workflowFiles: ['agentRunWithProfile.workflow.json'] });
	});

	describe('omits the profileId query param when no Browser Profile ID is set', () => {
		beforeAll(() => {
			nock(AIRTOP_BASE_URL).get(AGENT_DETAILS_PATH).reply(200, { webhookId: 'test-webhook' });
			// `.query({})` only matches a request without any query params, asserting that no
			// profileId is sent when the field is left empty.
			nock(AIRTOP_BASE_URL)
				.post(AGENT_WEBHOOK_PATH, { configVars: {} })
				.query({})
				.reply(200, { invocationId: 'invocation-123' });
		});

		new NodeTestHarness().setupTests({ workflowFiles: ['agentRunWithoutProfile.workflow.json'] });
	});

	describe('awaits execution and returns the polled result with the profile forwarded', () => {
		beforeAll(() => {
			nock(AIRTOP_BASE_URL).get(AGENT_DETAILS_PATH).reply(200, { webhookId: 'test-webhook' });
			nock(AIRTOP_BASE_URL)
				.post(AGENT_WEBHOOK_PATH, { configVars: {} })
				.query({ profileId: 'my-profile' })
				.reply(200, { invocationId: 'invocation-123' });
			// Returning output on the first poll keeps the test deterministic (no 1s wait).
			nock(AIRTOP_BASE_URL)
				.get(AGENT_RESULT_PATH)
				.reply(200, { status: 'Completed', output: { result: 'success' } });
		});

		new NodeTestHarness().setupTests({ workflowFiles: ['agentRunAwaitWithProfile.workflow.json'] });
	});
});
