import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import { buildWorkflow } from '../harness/build-workflow';
import type { ConversationSeed } from '../harness/conversation-seed';
import type { EvalLogger } from '../harness/logger';

// Stubbed as in build-workflow-seed-cleanup: only the restore call matters here.
vi.mock('../harness/chat-loop', () => ({
	SSE_SETTLE_DELAY_MS: 0,
	startSseConnection: vi.fn().mockResolvedValue(undefined),
	waitForAllActivity: vi.fn().mockResolvedValue(undefined),
	runMultiTurnConversation: vi.fn().mockResolvedValue(undefined),
	recordUserTurn: vi.fn(),
}));

vi.mock('../outcome/workflow-discovery', () => ({
	buildAgentOutcome: vi.fn().mockResolvedValue({
		workflowsCreated: [{ id: 'built-wf-1', name: 'Built', nodeCount: 3, active: false }],
		executionsRun: [],
		dataTablesCreated: [],
		finalText: 'done',
		workflowJsons: [{ id: 'built-wf-1', name: 'Built', nodes: [], connections: {} }],
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

const SEED_WF_ID = 'wKk3RmT9xQ2bVn7L';

function inlineSeed(): ConversationSeed {
	return {
		messages: [
			{
				id: 'seed-1',
				type: 'llm',
				role: 'assistant',
				createdAt: '2026-06-29T09:00:01.000Z',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'build-workflow',
						state: 'resolved',
						input: {},
						output: { success: true, workflowId: SEED_WF_ID },
					},
				],
			},
		],
		workflows: [{ id: SEED_WF_ID, name: 'Batch loop', nodes: [], connections: {} }],
		dataTables: [],
	};
}

function makeClient(restoreThread: ReturnType<typeof vi.fn>): N8nClient {
	return {
		getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
		ensureThread: vi.fn().mockResolvedValue(undefined),
		setThreadCredentialAllowlist: vi.fn().mockResolvedValue(undefined),
		sendMessage: vi.fn().mockResolvedValue(undefined),
		getThreadMessages: vi.fn().mockResolvedValue({ messages: [] }),
		restoreThread,
	} as unknown as N8nClient;
}

const baseConfig = {
	conversation: [{ role: 'user' as const, text: 'the loop never runs twice — fix it' }],
	outcomeExpectations: ['the processing branch hangs off the loop output'],
	skipWorkflowChecks: true,
	preRunWorkflowIds: new Set<string>(),
	claimedWorkflowIds: new Set<string>(),
	logger: silentLogger,
};

describe('buildWorkflow with a conversationSeed', () => {
	it('restores the inline seed before the live turn', async () => {
		const restoreThread = vi
			.fn()
			.mockResolvedValue({ restored: 1, workflowIds: ['restored-wf-1'], dataTableIds: [] });

		const build = await buildWorkflow({
			client: makeClient(restoreThread),
			...baseConfig,
			conversationSeed: inlineSeed(),
		});

		expect(build.success).toBe(true);
		expect(restoreThread).toHaveBeenCalledTimes(1);
		const [, messages, workflows] = restoreThread.mock.calls[0] as [
			string,
			Array<Record<string, unknown>>,
			Array<{ id: string }>,
		];
		expect(messages).toHaveLength(1);
		expect(workflows).toHaveLength(1);
		// Remapped to a fresh id so parallel iterations can't share one row.
		const newId = workflows[0].id;
		expect(newId).not.toBe(SEED_WF_ID);
		expect(JSON.stringify(messages)).toContain(newId);
		expect(JSON.stringify(messages)).not.toContain(SEED_WF_ID);
	});

	it('fails as a seeding problem when the restore fails — never runs unseeded', async () => {
		const restoreThread = vi.fn().mockRejectedValue(new Error('restore rejected'));

		const build = await buildWorkflow({
			client: makeClient(restoreThread),
			...baseConfig,
			conversationSeed: inlineSeed(),
		});

		expect(build.success).toBe(false);
		expect(build.seedingFailed).toBe(true);
	});

	it('does not restore anything for a case with no seed', async () => {
		const restoreThread = vi
			.fn()
			.mockResolvedValue({ restored: 0, workflowIds: [], dataTableIds: [] });

		const build = await buildWorkflow({ client: makeClient(restoreThread), ...baseConfig });

		expect(build.success).toBe(true);
		expect(restoreThread).not.toHaveBeenCalled();
	});
});
