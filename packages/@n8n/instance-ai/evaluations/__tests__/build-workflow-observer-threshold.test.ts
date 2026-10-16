import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import { buildWorkflow } from '../harness/build-workflow';
import { runMultiTurnConversation } from '../harness/chat-loop';
import type { EvalLogger } from '../harness/logger';

// Only the message send matters here; the loop and the proxy are stubbed as in
// build-workflow-conversation-seed.
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

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

function makeClient(sendMessage: ReturnType<typeof vi.fn>): N8nClient {
	return {
		getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
		ensureThread: vi.fn().mockResolvedValue(undefined),
		setThreadCredentialAllowlist: vi.fn().mockResolvedValue(undefined),
		sendMessage,
		getThreadMessages: vi.fn().mockResolvedValue({ messages: [] }),
		listWorkflows: vi.fn().mockResolvedValue([]),
	} as unknown as N8nClient;
}

const baseConfig = {
	skipWorkflowChecks: true,
	preRunWorkflowIds: new Set<string>(),
	claimedWorkflowIds: new Set<string>(),
	logger: silentLogger,
};

const singleTurn = [{ role: 'user' as const, text: 'build a thing' }];
const twoTurns = [
	{ role: 'user' as const, text: 'build a thing' },
	{ role: 'user' as const, text: 'now add a filter' },
];

/** `sendMessage(threadId, message, attachments, mode, promptVersion, handoff, threshold)`. */
function thresholdSentBy(sendMessage: ReturnType<typeof vi.fn>): unknown {
	return sendMessage.mock.calls[0]?.[6];
}

describe('buildWorkflow observer threshold', () => {
	it('sends the compaction floor with the opening message when the case asks for it', async () => {
		const sendMessage = vi.fn().mockResolvedValue({ runId: 'run-1' });
		await buildWorkflow({
			client: makeClient(sendMessage),
			...baseConfig,
			conversation: singleTurn,
			requiresMemoryCompaction: true,
		});
		expect(thresholdSentBy(sendMessage)).toBe(1000);
	});

	it('sends no threshold otherwise, so the thread keeps the instance default', async () => {
		const sendMessage = vi.fn().mockResolvedValue({ runId: 'run-1' });
		await buildWorkflow({
			client: makeClient(sendMessage),
			...baseConfig,
			conversation: singleTurn,
		});
		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(thresholdSentBy(sendMessage)).toBeUndefined();
	});

	it('hands the threshold to the multi-turn loop as well', async () => {
		const sendMessage = vi.fn().mockResolvedValue({ runId: 'run-1' });
		await buildWorkflow({
			client: makeClient(sendMessage),
			...baseConfig,
			conversation: twoTurns,
			requiresMemoryCompaction: true,
		});
		// The opening turn goes out directly; the loop sends every later turn.
		expect(thresholdSentBy(sendMessage)).toBe(1000);
		expect(vi.mocked(runMultiTurnConversation)).toHaveBeenCalledWith(
			expect.objectContaining({ observerThresholdTokens: 1000 }),
		);
	});
});
