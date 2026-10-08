vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/instance-ai')>()),
	createInstanceAiTraceContext: vi.fn(async () => undefined),
	createOrchestratorRunControl: vi.fn(() => ({})),
}));

import type { AgentDbMessage } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { N8nMemory, N8nMemoryImpl } from '../../agents/integrations/n8n-memory';
import { RepeatableWorkNudgeService } from '../automation/repeatable-work-nudge.service';
import { InstanceAiService } from '../instance-ai.service';

const THREAD_ID = 'thread-1';
const ARTIFACTS = '<thread-artifacts>\n[]\nNo tabs are open.\n</thread-artifacts>';
const PREFERENCES = '<ai-preferences>\nKeep replies short.\n</ai-preferences>';
const SECTION = [
	'<repeatable-work>',
	'score: 0.6',
	'reasons: schedule-phrase',
	'suggested schedule: every day at 07:00 (cron 0 7 * * *)',
	'When the workflow for this request works, load the make-automatic skill and offer to make it automatic once.',
	'</repeatable-work>',
].join('\n');

type TurnOptions = {
	runId: string;
	resumeReason?: 'background_task_completed';
	checkpoint?: { isCheckpointFollowUp: boolean; checkpointTaskId: string };
};

type TurnInternals = {
	prepareStartTurn(
		turn: { user: User; message: string; thread: { id: string } },
		options: TurnOptions,
	): Promise<{ input: unknown }>;
};

const user = Object.assign(new User(), { id: 'user-1' });

/**
 * The service with every collaborator of `prepareStartTurn` replaced, so the test reads the
 * message that the turn sends to the agent.
 */
function createService(history: AgentDbMessage[]): TurnInternals {
	const service = Object.create(InstanceAiService.prototype) as Record<string, unknown>;
	const memory = {
		getThread: vi.fn(async () => ({ id: THREAD_ID, title: 'Sales digest', metadata: {} })),
	};
	Object.assign(service, {
		adapterService: { resolveExperimentGates: vi.fn(async () => ({ nodeContextEnabled: false })) },
		createProxyRunConfig: vi.fn(async () => ({})),
		browserSessionService: { getExtensionTraceContext: vi.fn(() => undefined) },
		readThreadProvenance: vi.fn(async () => ({})),
		tracing: { createOrchestratorResumeTraceContext: vi.fn(async () => undefined) },
		createExecutionEnvironment: vi.fn(async () => ({
			context: {},
			memory,
			modelId: 'test-model',
			orchestrationContext: {},
			conversationHistory: undefined,
			aiPreferencesEnabled: true,
			instanceContextEnabled: false,
			nodeUsageEnabled: false,
		})),
		applyTurnScope: vi.fn(async () => {}),
		snapshotAttachedAgents: vi.fn(async () => {}),
		buildWorkflowSetupStateBlock: vi.fn(async () => ''),
		instanceContext: {
			buildBlock: vi.fn(async () => ({ state: 'absent', reason: 'disabled' })),
		},
		getReplayedMessages: vi.fn(async () => history),
		resolveThreadArtifactsTurn: vi.fn(async () => ARTIFACTS),
		resolveBoundProject: vi.fn(async () => undefined),
		resolveAiPreferencesTurn: vi.fn(async () => ({
			block: PREFERENCES,
			payload: { preferences: [], renderedLength: PREFERENCES.length, injectedThisTurn: true },
		})),
		webhookBaseUrl: 'http://localhost:5678/webhook',
		formBaseUrl: 'http://localhost:5678/form',
		defaultTimeZone: 'UTC',
		createAgentFromEnvironment: vi.fn(async () => ({})),
		saveTurnDefaults: vi.fn(async () => {}),
		createTurnHandle: vi.fn((params: { input: unknown }) => params),
	});
	return service as unknown as TurnInternals;
}

async function sendTurn(message: string, options: TurnOptions, history: AgentDbMessage[] = []) {
	const handle = await createService(history).prepareStartTurn(
		{ user, message, thread: { id: THREAD_ID } },
		options,
	);
	if (typeof handle.input !== 'string') throw new Error('Expected a text turn');
	return handle.input;
}

function threadContextOf(input: string): string {
	const start = input.indexOf('<thread-context>');
	const end = input.indexOf('</thread-context>');
	if (start !== 0 || end < 0) throw new Error('Expected a leading thread-context block');
	return input.slice(start, end);
}

describe('InstanceAiService — repeatable-work section of a turn', () => {
	const nudge = mock<RepeatableWorkNudgeService>();

	beforeEach(() => {
		vi.resetAllMocks();
		Container.set(RepeatableWorkNudgeService, nudge);
	});

	afterAll(() => {
		Container.reset();
	});

	it('puts the section inside thread-context, after thread-artifacts and preferences', async () => {
		nudge.forTurn.mockResolvedValue(SECTION);

		const input = await sendTurn('Send it every day at 7', { runId: 'run-1' });
		const threadContext = threadContextOf(input);

		const order = [ARTIFACTS, PREFERENCES, SECTION, '<current-date-time>'].map((part) =>
			threadContext.indexOf(part),
		);
		expect(order.every((index) => index > 0)).toBe(true);
		expect(order).toEqual([...order].sort((a, b) => a - b));
		expect(input.endsWith('\n\nSend it every day at 7')).toBe(true);
		expect(nudge.forTurn).toHaveBeenCalledWith(
			THREAD_ID,
			'Send it every day at 7',
			expect.any(Function),
		);
	});

	it('passes the replayed history to the check', async () => {
		const history: AgentDbMessage[] = [
			{ id: 'm-1', createdAt: new Date(), role: 'user', content: [{ type: 'text', text: 'Hi' }] },
		];
		nudge.forTurn.mockImplementation(async (_threadId, _message, loadHistory) => {
			expect(await loadHistory()).toBe(history);
			return undefined;
		});

		const input = await sendTurn('Hello', { runId: 'run-1' }, history);

		expect(nudge.forTurn).toHaveBeenCalledTimes(1);
		expect(input).not.toContain('<repeatable-work>');
	});

	it('sends no section when the check returns none', async () => {
		nudge.forTurn.mockResolvedValue(undefined);

		const input = await sendTurn('Hello', { runId: 'run-1' });

		expect(input).toContain(ARTIFACTS);
		expect(input).not.toContain('<repeatable-work>');
	});

	it('never runs the check on a resumed turn', async () => {
		nudge.forTurn.mockResolvedValue(SECTION);

		const input = await sendTurn('(continue)', {
			runId: 'run-1',
			resumeReason: 'background_task_completed',
		});

		expect(nudge.forTurn).not.toHaveBeenCalled();
		expect(input).not.toContain('<repeatable-work>');
	});

	it('never runs the check on a machine follow-up', async () => {
		nudge.forTurn.mockResolvedValue(SECTION);

		const input = await sendTurn('(continue)', {
			runId: 'run-1',
			checkpoint: { isCheckpointFollowUp: true, checkpointTaskId: 'task-1' },
		});

		expect(nudge.forTurn).not.toHaveBeenCalled();
		expect(input).not.toContain('<repeatable-work>');
	});

	it('adds the section that the real check builds from the chat', async () => {
		const assistantMemory = mock<N8nMemoryImpl>();
		assistantMemory.getThread.mockResolvedValue(null);
		assistantMemory.getMessages.mockResolvedValue([]);
		assistantMemory.patchThread.mockResolvedValue(null);
		const memory = mock<N8nMemory>();
		memory.getImplementation.mockReturnValue(assistantMemory);
		Container.set(
			RepeatableWorkNudgeService,
			new RepeatableWorkNudgeService(mock<Logger>(), memory),
		);

		const input = await sendTurn('Send me the sales numbers every weekday at 8', {
			runId: 'run-1',
		});

		expect(threadContextOf(input)).toContain(
			'<repeatable-work>\nscore: 0.6\nreasons: schedule-phrase\nsuggested schedule: every weekday at 08:00 (cron 0 8 * * 1-5)\n',
		);
		expect(assistantMemory.patchThread).toHaveBeenCalledWith(
			expect.objectContaining({ threadId: THREAD_ID }),
		);
	});
});
