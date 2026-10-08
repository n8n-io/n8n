vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/instance-ai')>()),
	createInstanceAiTraceContext: vi.fn(async () => undefined),
	createOrchestratorRunControl: vi.fn(() => ({})),
}));

import { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { RepeatableWorkNudgeService } from '../automation/repeatable-work-nudge.service';
import { InstanceAiService } from '../instance-ai.service';

const THREAD_ID = 'thread-1';
const PREFERENCES = '<ai-preferences>\nKeep replies short.\n</ai-preferences>';

type TurnInternals = {
	prepareStartTurn(
		turn: { user: User; message: string; thread: { id: string } },
		options: { runId: string },
	): Promise<{ input: unknown }>;
};

const user = Object.assign(new User(), { id: 'owner-1' });

/** The service with every collaborator of `prepareStartTurn` replaced. */
function createService(sharedThread: boolean) {
	const service = Object.create(InstanceAiService.prototype) as Record<string, unknown>;
	const resolveAiPreferencesTurn = vi.fn(async () => ({
		block: PREFERENCES,
		payload: { preferences: [], renderedLength: PREFERENCES.length, injectedThisTurn: true },
	}));
	Object.assign(service, {
		adapterService: { resolveExperimentGates: vi.fn(async () => ({ nodeContextEnabled: false })) },
		createProxyRunConfig: vi.fn(async () => ({})),
		browserSessionService: { getExtensionTraceContext: vi.fn(() => undefined) },
		readThreadProvenance: vi.fn(async () => ({})),
		tracing: { createOrchestratorResumeTraceContext: vi.fn(async () => undefined) },
		createExecutionEnvironment: vi.fn(async () => ({
			context: {},
			memory: { getThread: vi.fn(async () => ({ id: THREAD_ID, title: 'Chat', metadata: {} })) },
			modelId: 'test-model',
			orchestrationContext: {},
			conversationHistory: undefined,
			aiPreferencesEnabled: true,
			sharedThread,
			instanceContextEnabled: false,
			nodeUsageEnabled: false,
		})),
		applyTurnScope: vi.fn(async () => {}),
		snapshotAttachedAgents: vi.fn(async () => {}),
		buildWorkflowSetupStateBlock: vi.fn(async () => ''),
		instanceContext: {
			buildBlock: vi.fn(async () => ({ state: 'absent', reason: 'disabled' })),
		},
		getReplayedMessages: vi.fn(async () => []),
		resolveThreadArtifactsTurn: vi.fn(async () => ''),
		resolveBoundProject: vi.fn(async () => undefined),
		resolveAiPreferencesTurn,
		webhookBaseUrl: 'http://localhost:5678/webhook',
		formBaseUrl: 'http://localhost:5678/form',
		defaultTimeZone: 'UTC',
		createAgentFromEnvironment: vi.fn(async () => ({})),
		saveTurnDefaults: vi.fn(async () => {}),
		createTurnHandle: vi.fn((params: { input: unknown }) => params),
	});
	const internals = service as unknown as TurnInternals;
	const send = async (message: string) =>
		await internals.prepareStartTurn(
			{ user, message, thread: { id: THREAD_ID } },
			{ runId: 'run-1' },
		);
	return { send, resolveAiPreferencesTurn };
}

describe('InstanceAiService — AI preferences in a shared chat', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		const nudge = mock<RepeatableWorkNudgeService>();
		nudge.forTurn.mockResolvedValue(undefined);
		Container.set(RepeatableWorkNudgeService, nudge);
	});

	afterAll(() => {
		Container.reset();
	});

	it('adds the preferences of the owner to a private chat', async () => {
		const { send, resolveAiPreferencesTurn } = createService(false);

		const { input } = await send('Build the invoice flow');

		expect(input).toEqual(expect.stringContaining(PREFERENCES));
		expect(resolveAiPreferencesTurn).toHaveBeenCalledWith(
			'owner-1',
			undefined,
			THREAD_ID,
			expect.any(Function),
		);
	});

	it('leaves the preferences of the owner out of a shared chat, which teammates read', async () => {
		const { send, resolveAiPreferencesTurn } = createService(true);

		const { input } = await send('Build the invoice flow');

		expect(input).toEqual(expect.stringContaining('Build the invoice flow'));
		expect(input).not.toEqual(expect.stringContaining('<ai-preferences>'));
		expect(resolveAiPreferencesTurn).not.toHaveBeenCalled();
	});
});
