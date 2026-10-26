import { loadReplayedMessages, type AgentDbMessage, type BuiltMemory } from '@n8n/agents';
import type { AiPreferencesAppliedPayload } from '@n8n/api-types';
import { AI_PREFERENCES_CLEARED_BLOCK, renderAiPreferencesBlock } from '@n8n/backend-services';
import type { Mock } from 'vitest';

import { buildThreadArtifactsBlock, buildThreadContextBlock } from '../../internal-messages';
import type { AssistantTurnEnvironment } from '../assistant-turn-environment.factory';
import { AssistantTurnInputBuilder } from '../assistant-turn-input.builder';

type ThreadMemoryMock = {
	getMessages: Mock;
	getCursor: Mock;
	getActiveObservationLog: Mock;
	getMessagesForObservationScope: Mock;
};

/** A thread memory with an observation log, so the replay reads the post-cursor window. */
function createThreadMemory(): ThreadMemoryMock {
	return {
		getMessages: vi.fn().mockResolvedValue([]),
		getCursor: vi.fn().mockResolvedValue(null),
		getActiveObservationLog: vi.fn().mockResolvedValue([]),
		getMessagesForObservationScope: vi.fn().mockResolvedValue([]),
		...Object.fromEntries(
			[
				'commitObservationLogBatch',
				'appendObservationLogEntries',
				'getObservationLog',
				'dropObservationLogEntries',
				'supersedeObservationLogEntries',
				'applyObservationLogReflection',
			].map((method) => [method, vi.fn()]),
		),
	};
}

async function loadHistory(memory: ThreadMemoryMock): Promise<AgentDbMessage[]> {
	return await loadReplayedMessages(
		memory as unknown as BuiltMemory,
		{ threadId: 'thread-1', resourceId: 'user-1' },
		{ observationalMemory: true },
	);
}

describe('AssistantTurnInputBuilder — resolveThreadArtifactsTurn', () => {
	type Context = {
		artifacts: Array<{ type: 'workflow'; id: string; name?: string }>;
		activeId?: string;
	};
	type Internals = {
		resolveThreadArtifactsTurn: (
			threadId: string,
			context: Context | undefined,
			attachments: Array<{ type: 'workflow'; id: string; name: string }>,
			loadHistory: () => Promise<unknown[]>,
		) => Promise<string>;
		agentMemory: ThreadMemoryMock;
		logger: { warn: Mock };
	};

	function createService(): Internals {
		const service = Object.create(AssistantTurnInputBuilder.prototype) as unknown as Internals;
		service.agentMemory = createThreadMemory();
		service.logger = { warn: vi.fn() };
		return service;
	}

	const digest = { type: 'workflow' as const, id: 'wf-1', name: 'Digest' };
	const report = { type: 'workflow' as const, id: 'wf-2', name: 'Report' };
	const storedUserTurn = (block: string) => ({
		role: 'user',
		content: [buildThreadContextBlock(['Ambient context.', block]), 'Change it'].join('\n\n'),
	});

	async function resolve(
		service: Internals,
		context: Context | undefined,
		attachments: Array<{ type: 'workflow'; id: string; name: string }> = [],
	) {
		return await service.resolveThreadArtifactsTurn(
			'thread-1',
			context,
			attachments,
			async () => await loadHistory(service.agentMemory),
		);
	}

	it('sends nothing when the client sent no tabs', async () => {
		expect(await resolve(createService(), undefined)).toBe('');
	});

	it('sends the tabs when the history has no tabs block', async () => {
		const block = await resolve(createService(), { artifacts: [digest], activeId: 'wf-1' });

		expect(block).toContain('<thread-artifacts>');
		expect(block).toContain('(id: `wf-1`) [current]');
	});

	it('does not send the tabs again when they have not changed, also after a reorder', async () => {
		const service = createService();
		const earlier = buildThreadArtifactsBlock({ artifacts: [digest, report], activeId: 'wf-1' });
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(earlier)]);

		expect(await resolve(service, { artifacts: [digest, report], activeId: 'wf-1' })).toBe('');
		expect(await resolve(service, { artifacts: [report, digest], activeId: 'wf-1' })).toBe('');
	});

	it('sends the tabs when a tab closed or the active tab changed', async () => {
		const service = createService();
		const earlier = buildThreadArtifactsBlock({ artifacts: [digest, report], activeId: 'wf-1' });
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(earlier)]);

		expect(await resolve(service, { artifacts: [digest], activeId: 'wf-1' })).toContain(
			'Workflow "Digest"',
		);
		expect(await resolve(service, { artifacts: [digest, report], activeId: 'wf-2' })).toContain(
			'(id: `wf-2`) [current]',
		);
	});

	it('says no tabs are open once, then not again while nothing changes', async () => {
		const service = createService();
		const noTabs = await resolve(service, { artifacts: [] });
		expect(noTabs).toContain('The user has no tabs open in this conversation’s preview.');

		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(noTabs)]);
		expect(await resolve(service, { artifacts: [] })).toBe('');
	});

	it('says no tabs are open after a block that listed tabs or only an editor hand-off', async () => {
		const service = createService();
		service.agentMemory.getMessages.mockResolvedValue([
			storedUserTurn(buildThreadArtifactsBlock({ artifacts: [digest] })),
		]);
		expect(await resolve(service, { artifacts: [] })).toContain('no tabs open');

		const handoffOnly = buildThreadArtifactsBlock({ artifacts: [] }, [
			{ type: 'workflow' as const, id: 'wf-9', name: 'Handed off' },
		]);
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(handoffOnly)]);
		expect(await resolve(service, { artifacts: [] })).toContain('no tabs open');
	});

	it('says no tabs are open again when the same block was compacted out of the replay window', async () => {
		const service = createService();
		// The full history has the same block, so only a replay-window read sends it again.
		service.agentMemory.getMessages.mockResolvedValue([
			storedUserTurn(buildThreadArtifactsBlock({ artifacts: [] })),
		]);
		service.agentMemory.getCursor.mockResolvedValue({
			lastObservedAt: new Date('2026-09-01T00:00:00.000Z'),
			lastObservedMessageId: 'message-1',
		});
		service.agentMemory.getActiveObservationLog.mockResolvedValue([{ id: 'observation-1' }]);
		service.agentMemory.getMessagesForObservationScope.mockResolvedValue([]);

		expect(await resolve(service, { artifacts: [] })).toContain('no tabs open');
	});

	it('always sends a block that carries an editor hand-off', async () => {
		const service = createService();
		const attachments = [{ type: 'workflow' as const, id: 'wf-1', name: 'Digest' }];
		const earlier = buildThreadArtifactsBlock({ artifacts: [digest] }, attachments);
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(earlier)]);

		expect(await resolve(service, { artifacts: [digest] }, attachments)).toBe(earlier);
	});

	it('sends the tabs again when the earlier block was compacted out of the replay window', async () => {
		const service = createService();
		service.agentMemory.getMessages.mockResolvedValue([
			storedUserTurn(buildThreadArtifactsBlock({ artifacts: [digest] })),
		]);
		service.agentMemory.getCursor.mockResolvedValue({
			lastObservedAt: new Date('2026-09-01T00:00:00.000Z'),
			lastObservedMessageId: 'message-1',
		});
		service.agentMemory.getActiveObservationLog.mockResolvedValue([{ id: 'observation-1' }]);
		service.agentMemory.getMessagesForObservationScope.mockResolvedValue([]);

		expect(await resolve(service, { artifacts: [digest] })).toContain('Workflow "Digest"');
	});

	it('sends the tabs when the history cannot be read', async () => {
		const service = createService();
		service.agentMemory.getMessages.mockRejectedValue(new Error('database is locked'));

		expect(await resolve(service, { artifacts: [] })).toContain('no tabs open');
		expect(service.logger.warn).toHaveBeenCalled();
	});
});

describe('AssistantTurnInputBuilder — resolveAiPreferencesTurn', () => {
	type StoredMessage = { role: string; content: string };
	type Internals = {
		resolveAiPreferencesTurn: (
			userId: string,
			project: { id: string; name: string; type: 'team' } | undefined,
			threadId: string,
			loadHistory: () => Promise<unknown[]>,
		) => Promise<{ block: string | undefined; payload: AiPreferencesAppliedPayload }>;
		aiPreferenceService: { getApplicable: Mock };
		agentMemory: ThreadMemoryMock;
		logger: { warn: Mock };
	};

	function createService(): Internals {
		const service = Object.create(AssistantTurnInputBuilder.prototype) as unknown as Internals;
		service.aiPreferenceService = { getApplicable: vi.fn() };
		service.agentMemory = createThreadMemory();
		service.logger = { warn: vi.fn() };
		return service;
	}

	async function resolvePreferences(
		service: Internals,
		project: { id: string; name: string; type: 'team' } | undefined,
	) {
		return await service.resolveAiPreferencesTurn(
			'user-1',
			project,
			'thread-1',
			async () => await loadHistory(service.agentMemory),
		);
	}

	const applicable = {
		instance: [],
		user: [{ id: 'pref-1', content: 'Keep replies short.' }],
		projects: [
			{
				id: 'project-1',
				name: 'Marketing',
				items: [{ id: 'pref-2', content: 'Prefer HubSpot nodes.' }],
			},
		],
	};
	const none = { instance: [], user: [], projects: [] };
	const boundProject = { id: 'project-1', name: 'Marketing', type: 'team' as const };

	/** A persisted user turn whose leading thread-context carries `block`, as the service stores it. */
	const storedUserTurn = (
		block: string | undefined,
		text = 'Build me a digest',
	): StoredMessage => ({
		role: 'user',
		content: [buildThreadContextBlock(['Ambient context.', block]), text].join('\n\n'),
	});

	const storedSave = (ok = true, toolName = 'save_user_preference'): AgentDbMessage => ({
		id: 'save-message',
		createdAt: new Date('2026-09-01T00:00:00.000Z'),
		role: 'assistant',
		content: [
			{
				type: 'tool-call',
				toolCallId: 'save-call',
				toolName,
				input: { content: 'Use minimal node names.', scope: 'user' },
				state: 'resolved',
				output: ok
					? {
							ok: true,
							preference: { id: 'removed-pref', content: 'Use minimal node names.', scope: 'user' },
						}
					: { ok: false, reason: 'failed' },
			},
		],
	});

	it('clears a chat save removed before any preference block carried it', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(none);
		service.agentMemory.getMessages.mockResolvedValue([
			storedUserTurn(undefined, 'Always use minimal node names.'),
			storedSave(),
		]);

		const turn = await resolvePreferences(service, undefined);

		expect(turn.block).toBe(AI_PREFERENCES_CLEARED_BLOCK);
		expect(turn.payload).toEqual({
			preferences: [],
			renderedLength: AI_PREFERENCES_CLEARED_BLOCK.length,
			injectedThisTurn: true,
		});
	});

	it.each([
		['other preferences remain', applicable],
		['no preferences remain', none],
	])(
		'refreshes after a removed save when %s, then reuses the refreshed block',
		async (_, preferences) => {
			const service = createService();
			service.aiPreferenceService.getApplicable.mockResolvedValue(preferences);
			const block = renderAiPreferencesBlock(preferences) ?? AI_PREFERENCES_CLEARED_BLOCK;
			const history = [storedUserTurn(block), storedSave()];
			service.agentMemory.getMessages.mockResolvedValue(history);

			const turn = await resolvePreferences(service, boundProject);

			expect(turn.block).toBe(block);
			expect(turn.payload.injectedThisTurn).toBe(true);
			expect(turn.payload.preferences.map(({ id }) => id)).not.toContain('removed-pref');

			service.agentMemory.getMessages.mockResolvedValue([...history, storedUserTurn(turn.block)]);
			const nextTurn = await resolvePreferences(service, boundProject);

			expect(nextTurn.block).toBeUndefined();
			expect(nextTurn.payload).toMatchObject({
				injectedThisTurn: false,
			});
		},
	);

	it.each([
		['failed save', false, 'save_user_preference'],
		['unrelated tool', true, 'get_workflow'],
	] as const)('does not refresh for a %s', async (_, ok, toolName) => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(none);
		service.agentMemory.getMessages.mockResolvedValue([
			storedUserTurn(undefined),
			storedSave(ok, toolName),
		]);

		const turn = await resolvePreferences(service, undefined);

		expect(turn.block).toBeUndefined();
		expect(turn.payload).toEqual({ preferences: [], renderedLength: 0, injectedThisTurn: false });
	});

	it('injects the block and reports it when the conversation never carried one', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(applicable);

		const turn = await resolvePreferences(service, boundProject);

		expect(service.aiPreferenceService.getApplicable).toHaveBeenCalledWith('user-1', [
			boundProject,
		]);
		expect(turn.block).toContain('<ai-preferences>');
		expect(turn.block).toContain('Preferences for project "Marketing":');
		expect(turn.block).toContain('- Keep replies short.');
		expect(turn.payload).toEqual({
			preferences: [
				{ id: 'pref-1', scope: 'user' },
				{ id: 'pref-2', scope: 'project', projectId: 'project-1', projectName: 'Marketing' },
			],
			renderedLength: turn.block?.length,
			injectedThisTurn: true,
		});
	});

	it('re-uses the previous copy when the rendered text is unchanged', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(applicable);
		const block = renderAiPreferencesBlock(applicable);
		if (!block) throw new Error('expected a block');
		// A later user turn without a block must not stop the scan.
		service.agentMemory.getMessages.mockResolvedValue([
			storedUserTurn(block),
			{ role: 'assistant', content: 'Done.' },
			storedUserTurn(undefined, 'Thanks'),
		]);

		const turn = await resolvePreferences(service, boundProject);

		expect(turn.block).toBeUndefined();
		expect(turn.payload).toEqual({
			preferences: [
				{ id: 'pref-1', scope: 'user' },
				{ id: 'pref-2', scope: 'project', projectId: 'project-1', projectName: 'Marketing' },
			],
			renderedLength: block.length,
			injectedThisTurn: false,
		});
	});

	it('re-sends the block when the rendered text differs from the previous copy', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(applicable);
		const olderBlock = renderAiPreferencesBlock({
			...none,
			user: [{ id: 'pref-1', content: 'Write long replies.' }],
		});
		if (!olderBlock) throw new Error('expected a block');
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(olderBlock)]);

		const turn = await resolvePreferences(service, boundProject);

		expect(turn.block).toContain('- Keep replies short.');
		expect(turn.payload).toMatchObject({ injectedThisTurn: true });
	});

	it('publishes an empty payload when the read fails, without touching the history', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockRejectedValue(new Error('db down'));

		const turn = await resolvePreferences(service, undefined);

		expect(turn.block).toBeUndefined();
		expect(turn.payload).toEqual({ preferences: [], renderedLength: 0, injectedThisTurn: false });
		expect(service.agentMemory.getMessages).not.toHaveBeenCalled();
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Assistant failed to read the AI preferences for this turn',
			{ userId: 'user-1', error: 'db down' },
		);
	});

	it('sends the cleared block once when every preference is gone but the thread carries one', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(none);
		const block = renderAiPreferencesBlock(applicable);
		if (!block) throw new Error('expected a block');
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(block)]);

		const turn = await resolvePreferences(service, undefined);

		expect(turn.block).toBe(AI_PREFERENCES_CLEARED_BLOCK);
		expect(turn.payload).toEqual({
			preferences: [],
			renderedLength: AI_PREFERENCES_CLEARED_BLOCK.length,
			injectedThisTurn: true,
		});

		// The cleared block obeys the same change rule: a thread that stays empty carries it once.
		service.agentMemory.getMessages.mockResolvedValue([
			storedUserTurn(block),
			storedUserTurn(AI_PREFERENCES_CLEARED_BLOCK),
		]);
		const nextTurn = await resolvePreferences(service, undefined);

		expect(nextTurn.block).toBeUndefined();
		expect(nextTurn.payload).toMatchObject({ preferences: [], injectedThisTurn: false });
	});

	it('sends nothing and reports an empty payload when there are no preferences and never were', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(none);

		const turn = await resolvePreferences(service, undefined);

		expect(turn.block).toBeUndefined();
		expect(turn.payload).toEqual({ preferences: [], renderedLength: 0, injectedThisTurn: false });
	});

	it('injects when the history read fails, because re-sending is the safe direction', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(applicable);
		service.agentMemory.getMessages.mockRejectedValue(new Error('history down'));

		const turn = await resolvePreferences(service, boundProject);

		expect(turn.block).toContain('<ai-preferences>');
		expect(turn.payload).toMatchObject({ injectedThisTurn: true });
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Assistant failed to read the last AI preferences block of this thread',
			{ threadId: 'thread-1', error: 'history down' },
		);
	});

	it('re-injects when the observation cursor has compacted the turn that carried the block', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(applicable);
		const block = renderAiPreferencesBlock(applicable);
		if (!block) throw new Error('expected a block');
		// The full table still holds the block, but the model only replays the post-cursor
		// tail, where the block does not appear — so it must count as absent.
		const cursor = {
			observationScopeId: 'thread-1',
			lastObservedMessageId: 'msg-9',
			lastObservedAt: new Date('2026-09-01T00:00:00.000Z'),
		};
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(block)]);
		service.agentMemory.getCursor.mockResolvedValue(cursor);
		service.agentMemory.getActiveObservationLog.mockResolvedValue([{ id: 'obs-1' }]);
		service.agentMemory.getMessagesForObservationScope.mockResolvedValue([
			storedUserTurn(undefined, 'Thanks'),
		]);

		const turn = await resolvePreferences(service, boundProject);

		expect(turn.block).toContain('<ai-preferences>');
		expect(turn.payload).toMatchObject({ injectedThisTurn: true });
		expect(service.agentMemory.getMessages).not.toHaveBeenCalled();
		expect(service.agentMemory.getMessagesForObservationScope).toHaveBeenCalledWith('thread-1', {
			since: {
				sinceCreatedAt: cursor.lastObservedAt,
				sinceMessageId: cursor.lastObservedMessageId,
			},
		});
	});

	it('reads the full history when a cursor exists without an active observation, like the runtime', async () => {
		const service = createService();
		service.aiPreferenceService.getApplicable.mockResolvedValue(applicable);
		const block = renderAiPreferencesBlock(applicable);
		if (!block) throw new Error('expected a block');
		service.agentMemory.getCursor.mockResolvedValue({
			observationScopeId: 'thread-1',
			lastObservedMessageId: 'msg-9',
			lastObservedAt: new Date('2026-09-01T00:00:00.000Z'),
		});
		service.agentMemory.getActiveObservationLog.mockResolvedValue([]);
		service.agentMemory.getMessages.mockResolvedValue([storedUserTurn(block)]);

		const turn = await resolvePreferences(service, boundProject);

		expect(turn.block).toBeUndefined();
		expect(turn.payload).toMatchObject({ injectedThisTurn: false });
		expect(service.agentMemory.getMessagesForObservationScope).not.toHaveBeenCalled();
	});
});

describe('AssistantTurnInputBuilder — applyTurnScope', () => {
	function createEnvironment() {
		const workflowTasks = { reportBuildOutcome: vi.fn() };
		return {
			context: {},
			orchestrationContext: {},
			workflowTasks,
		} as unknown as AssistantTurnEnvironment;
	}

	function createBuilder() {
		return Object.assign(Object.create(AssistantTurnInputBuilder.prototype) as object, {
			defaultTimeZone: 'UTC',
		}) as unknown as AssistantTurnInputBuilder;
	}

	const scope = {
		threadId: 'thread-1',
		runId: 'run-1',
		message: 'Build a digest',
		fileAttachments: [],
	};

	it('gives an ordinary turn a new work item that reports to the workflow loop', () => {
		const environment = createEnvironment();

		createBuilder().applyTurnScope(environment, scope);

		expect(environment.context.workflowBuildContext).toEqual({
			threadId: 'thread-1',
			runId: 'run-1',
			taskId: 'build-run-1',
			workItemId: expect.stringMatching(/^wi_/),
			workflowTaskService: environment.workflowTasks,
		});
		expect(environment.orchestrationContext).toMatchObject({
			currentUserMessage: 'Build a digest',
			timeZone: 'UTC',
		});
	});
});
