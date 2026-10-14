import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import { buildWorkflow } from '../harness/build-workflow';
import { waitForAllActivity, type ConfirmationStrategy } from '../harness/chat-loop';
import type { EvalLogger } from '../harness/logger';
import type { CapturedEvent } from '../types';

const proxyAnswer = {
	kind: 'questions',
	answers: [{ questionId: 'key_choice', selectedOptions: ['Create a new API key'] }],
};

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

vi.mock('../utils/user-proxy', () => ({
	UserProxyLlm: class {
		respondToConfirmation = vi.fn().mockResolvedValue(proxyAnswer);
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

function makeClient(): N8nClient {
	return {
		getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
		ensureThread: vi.fn().mockResolvedValue(undefined),
		setThreadCredentialAllowlist: vi.fn().mockResolvedValue(undefined),
		sendMessage: vi.fn().mockResolvedValue({ runId: 'run-1' }),
		getThreadMessages: vi.fn().mockResolvedValue({ messages: [] }),
		listWorkflows: vi.fn().mockResolvedValue([]),
	} as unknown as N8nClient;
}

function confirmationEvent(payload: Record<string, unknown>): CapturedEvent {
	return {
		type: 'confirmation-request',
		data: { type: 'confirmation-request', payload: { requestId: 'req-1', ...payload } },
	} as unknown as CapturedEvent;
}

async function singleTurnStrategy(): Promise<ConfirmationStrategy> {
	await buildWorkflow({
		client: makeClient(),
		skipWorkflowChecks: true,
		preRunWorkflowIds: new Set<string>(),
		claimedWorkflowIds: new Set<string>(),
		logger: silentLogger,
		conversation: [{ role: 'user', text: 'create a Gemini credential' }],
	});
	const strategy = vi.mocked(waitForAllActivity).mock.calls[0]?.[0].confirmationStrategy;
	if (!strategy) throw new Error('single-turn build passed no confirmation strategy');
	return strategy;
}

describe('buildWorkflow single-turn confirmations', () => {
	beforeEach(() => vi.mocked(waitForAllActivity).mockClear());

	it('answers ask-user questions through the user proxy instead of leaving them blank', async () => {
		const strategy = await singleTurnStrategy();
		const response = await strategy(
			confirmationEvent({
				inputType: 'questions',
				questions: [{ id: 'key_choice', question: 'Which key?', type: 'single' }],
			}),
		);
		expect(response).toEqual(proxyAnswer);
	});

	it('keeps auto-approving every other confirmation', async () => {
		const strategy = await singleTurnStrategy();
		const response = await strategy(confirmationEvent({ message: 'Open aistudio.google.com' }));
		expect(response).toEqual({ kind: 'approval', approved: true });
	});
});
