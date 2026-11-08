import { vi } from 'vitest';

import { N8nApiError, type N8nClient } from '../clients/n8n-client';
import { buildWorkflow } from '../harness/build-workflow';
import {
	resolveCredentialSetupFixture,
	startCredentialSetupLane,
	type CredentialSetupLane,
} from '../harness/credential-setup-lane';
import type { EvalLogger } from '../harness/logger';

vi.mock('../harness/chat-loop', async (importActual) => {
	const actual = await importActual<typeof import('../harness/chat-loop')>();
	return {
		SSE_SETTLE_DELAY_MS: 0,
		startSseConnection: vi.fn().mockResolvedValue(undefined),
		waitForAllActivity: vi.fn().mockResolvedValue(undefined),
		runMultiTurnConversation: vi.fn().mockResolvedValue(undefined),
		recordUserTurn: vi.fn(),
		buildAutoApprovePayload: actual.buildAutoApprovePayload,
	};
});

vi.mock('../harness/credential-setup-lane', async (importActual) => ({
	...(await importActual<typeof import('../harness/credential-setup-lane')>()),
	startCredentialSetupLane: vi.fn(),
}));

vi.mock('../outcome/workflow-discovery', () => ({
	buildAgentOutcome: vi.fn().mockResolvedValue({
		workflowsCreated: [],
		executionsRun: [],
		dataTablesCreated: [],
		finalText: 'done',
		workflowJsons: [],
	}),
	extractWorkflowIdsFromMessages: vi.fn().mockReturnValue([]),
}));

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

function makeClient(): N8nClient {
	return {
		getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
		ensureThread: vi.fn().mockResolvedValue(undefined),
		setThreadCredentialAllowlist: vi.fn().mockResolvedValue(undefined),
		setThreadCredentialTestTarget: vi.fn().mockResolvedValue(undefined),
		listCredentialIds: vi.fn().mockResolvedValue([]),
		listCredentials: vi.fn().mockResolvedValue([]),
		sendMessage: vi.fn().mockResolvedValue({ runId: 'run-1' }),
		getThreadMessages: vi.fn().mockResolvedValue({ messages: [] }),
		listWorkflows: vi.fn().mockResolvedValue([]),
	} as unknown as N8nClient;
}

async function buildWithLane(
	lane: Partial<CredentialSetupLane>,
	client = makeClient(),
): Promise<N8nClient> {
	vi.mocked(startCredentialSetupLane).mockResolvedValue({
		local: false,
		close: vi.fn().mockResolvedValue(undefined),
		...lane,
	} as CredentialSetupLane);
	await buildWorkflow({
		client,
		skipWorkflowChecks: true,
		preRunWorkflowIds: new Set<string>(),
		claimedWorkflowIds: new Set<string>(),
		logger: silentLogger,
		conversation: [{ role: 'user', text: 'create a Slack credential' }],
		credentialSetupSelection: await resolveCredentialSetupFixture({ credentialFixture: 'slack' }),
	});
	return client;
}

describe('buildWorkflow credential test target', () => {
	it('aims the thread at the fixture stand-in before the first message', async () => {
		const client = await buildWithLane({
			credentialType: 'slackApi',
			verifyBaseUrl: 'http://stand-in.test:4100',
			credentialUrlField: 'url',
		});

		expect(client.setThreadCredentialTestTarget).toHaveBeenCalledWith(expect.any(String), {
			credentialType: 'slackApi',
			baseUrl: 'http://stand-in.test:4100',
			urlField: 'url',
		});
		expect(
			vi.mocked(client.setThreadCredentialTestTarget).mock.invocationCallOrder[0],
		).toBeLessThan(vi.mocked(client.sendMessage).mock.invocationCallOrder[0]);
	});

	it('still builds against a backend without the endpoint', async () => {
		const client = makeClient();
		vi.mocked(client.setThreadCredentialTestTarget).mockRejectedValue(
			new N8nApiError('Not found', 404),
		);

		await buildWithLane(
			{
				credentialType: 'slackApi',
				verifyBaseUrl: 'http://stand-in.test:4100',
				credentialUrlField: 'url',
			},
			client,
		);

		expect(client.sendMessage).toHaveBeenCalled();
	});

	it('sets no target when the fixture ships no stand-in', async () => {
		const client = await buildWithLane({ credentialType: 'slackApi', credentialUrlField: 'url' });

		expect(client.setThreadCredentialTestTarget).not.toHaveBeenCalled();
	});
});
