import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import { buildWorkflow } from '../harness/build-workflow';
import type { EvalLogger } from '../harness/logger';
import { extractOutcomeFromEvents } from '../outcome/event-parser';

// Only thread setup and result bookkeeping matter here; the loop and the proxy
// are stubbed as in build-workflow-observer-threshold.
vi.mock('../harness/chat-loop', () => ({
	SSE_SETTLE_DELAY_MS: 0,
	startSseConnection: vi.fn().mockResolvedValue(undefined),
	waitForAllActivity: vi.fn().mockResolvedValue(undefined),
	runMultiTurnConversation: vi.fn().mockResolvedValue(undefined),
	recordUserTurn: vi.fn(),
}));

vi.mock('../utils/user-proxy', () => ({
	UserProxyLlm: class {
		respondToConfirmation = vi.fn().mockResolvedValue({ approve: true });
		ingestEvents = vi.fn();
		decideFollowUp = vi.fn().mockResolvedValue({ kind: 'done' });
		getDecisionStats = vi.fn().mockReturnValue({});
	},
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

vi.mock('../outcome/event-parser', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../outcome/event-parser')>();
	return { ...actual, extractOutcomeFromEvents: vi.fn(actual.extractOutcomeFromEvents) };
});

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

function makeClient(sendMessage = vi.fn().mockResolvedValue({ runId: 'run-1' })) {
	const mocks = {
		getPersonalProjectId: vi.fn().mockResolvedValue('owner-project'),
		ensureThread: vi.fn().mockResolvedValue(undefined),
		createCredential: vi.fn().mockResolvedValue({ id: 'cred-1' }),
		setThreadCredentialAllowlist: vi.fn().mockResolvedValue(undefined),
		sendMessage,
		getThreadMessages: vi.fn().mockResolvedValue({ messages: [] }),
		listWorkflows: vi.fn().mockResolvedValue([]),
	};
	return { client: mocks as unknown as N8nClient, mocks };
}

const baseConfig = {
	skipWorkflowChecks: true,
	preRunWorkflowIds: new Set<string>(),
	claimedWorkflowIds: new Set<string>(),
	logger: silentLogger,
	conversation: [{ role: 'user' as const, text: 'build a thing' }],
	buildProject: vi.fn().mockResolvedValue({ userId: 'build-user', projectId: 'build-project' }),
};

describe('buildWorkflow build project', () => {
	it("binds the thread to the build's own project and creates the case's credentials there", async () => {
		const { client, mocks } = makeClient();

		const result = await buildWorkflow({
			client,
			...baseConfig,
			credentials: [{ type: 'slackApi' }],
		});

		expect(mocks.ensureThread.mock.calls[0]?.[1]).toBe('build-project');
		expect(mocks.createCredential.mock.calls[0]?.[4]).toBe('build-project');
		expect(mocks.getPersonalProjectId).not.toHaveBeenCalled();
		expect(result).toMatchObject({ buildProjectId: 'build-project', buildUserId: 'build-user' });
	});

	it('keeps the build user on a failed build, so cleanup still removes it', async () => {
		const { client } = makeClient(vi.fn().mockRejectedValue(new Error('chat send failed')));

		const result = await buildWorkflow({ client, ...baseConfig });

		expect(result.success).toBe(false);
		expect(result).toMatchObject({ buildProjectId: 'build-project', buildUserId: 'build-user' });
	});

	it('fails as a harness problem, before any thread exists, when no project can be provisioned', async () => {
		const { client, mocks } = makeClient();

		const result = await buildWorkflow({
			client,
			...baseConfig,
			buildProject: vi.fn().mockRejectedValue(new Error('no accept token')),
		});

		expect(result.success).toBe(false);
		expect(result.seedingFailed).toBe(true);
		expect(mocks.ensureThread).not.toHaveBeenCalled();
		expect(mocks.sendMessage).not.toHaveBeenCalled();
	});

	it("tags the artifact refs with the build's project, so later reads look there", async () => {
		const actual =
			await vi.importActual<typeof import('../outcome/event-parser')>('../outcome/event-parser');
		vi.mocked(extractOutcomeFromEvents).mockImplementationOnce((events) => ({
			...actual.extractOutcomeFromEvents(events),
			artifactRefs: [{ type: 'agent', id: 'agent-1' }],
		}));
		const { client } = makeClient();

		const result = await buildWorkflow({ client, ...baseConfig, workflowExpected: false });

		expect(result.artifactRefs).toEqual([
			{ type: 'agent', id: 'agent-1', projectId: 'build-project' },
		]);
	});
});
