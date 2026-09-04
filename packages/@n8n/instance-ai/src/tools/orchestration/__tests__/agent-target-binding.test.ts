import type { ThreadRecord } from '../../../storage/thread-patch';
import type { InstanceAiContext } from '../../../types';
import {
	agentBuilderTargetMetadata,
	getSessionAgentByRef,
	normalizeAgentRef,
	PENDING_AGENT_METADATA_KEY,
	clearedAgentBuilderTargetMetadata,
	resolveAgentBuilderTarget,
	saveAgentBuilderTarget,
	seedAgentBuilderTargetMetadata,
	threadAuthorizesAgentAdoption,
	withBoundAgentTarget,
} from '../agent-target-binding';

/** In-memory thread store shared across "turns" (fresh contexts). */
function createThreadMemory(initialMetadata: Record<string, unknown> = {}) {
	const thread: ThreadRecord = {
		id: 'thread-1',
		metadata: initialMetadata,
		resourceId: 'resource-1',
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	return {
		getThread: vi.fn<() => Promise<ThreadRecord>>().mockResolvedValue(thread),
		patchThread: vi.fn().mockImplementation(
			async (args: {
				update: (current: ThreadRecord) => { metadata?: Record<string, unknown> };
			}) => {
				const patch = args.update({ ...thread, metadata: { ...(thread.metadata ?? {}) } });
				if (patch?.metadata) thread.metadata = patch.metadata;
				return await Promise.resolve(thread);
			},
		),
	};
}

function createContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-1',
		threadId: 'thread-1',
		logger: { debug: vi.fn(), warn: vi.fn() },
		...overrides,
	} as unknown as InstanceAiContext;
}

const TARGET = { agentId: 'agent-1', projectId: 'project-1', ref: 'support-triage' };

describe('normalizeAgentRef', () => {
	it('slugifies casing, whitespace, and punctuation to the same key', () => {
		expect(normalizeAgentRef('Support Triage')).toBe('support-triage');
		expect(normalizeAgentRef('support_triage')).toBe('support-triage');
		expect(normalizeAgentRef('  Support-Triage  ')).toBe('support-triage');
	});

	it('keeps non-Latin names addressable instead of slugifying them away', () => {
		expect(normalizeAgentRef('支持代理')).toBe('支持代理');
		expect(normalizeAgentRef('Служба поддержки')).toBe('служба-поддержки');
	});
});

describe('agent-builder target binding', () => {
	it('round-trips the target through thread metadata across contexts', async () => {
		const threadMemory = createThreadMemory();
		await saveAgentBuilderTarget(createContext({ threadMemory }), TARGET);

		const nextTurn = createContext({ threadMemory });
		await expect(resolveAgentBuilderTarget(nextTurn)).resolves.toEqual({
			...TARGET,
			ref: 'support-triage',
		});
		expect(nextTurn.agentBuilderTarget).toEqual({ ...TARGET, ref: 'support-triage' });
	});

	it('prefers the in-memory context target over the persisted binding', async () => {
		const threadMemory = createThreadMemory({
			instanceAiAgentBuilderTarget: { agentId: 'agent-old', projectId: 'project-1' },
		});
		const context = createContext({ threadMemory, agentBuilderTarget: TARGET });
		await expect(resolveAgentBuilderTarget(context)).resolves.toEqual(TARGET);
	});

	it('returns undefined for missing or invalid metadata', async () => {
		const missing = createContext({ threadMemory: createThreadMemory() });
		await expect(resolveAgentBuilderTarget(missing)).resolves.toBeUndefined();

		const invalid = createContext({
			threadMemory: createThreadMemory({ instanceAiAgentBuilderTarget: { agentId: 42 } }),
		});
		await expect(resolveAgentBuilderTarget(invalid)).resolves.toBeUndefined();
	});

	it('warns and no-ops when saving without thread persistence available', async () => {
		const context = createContext({ threadMemory: undefined, threadId: undefined });
		await saveAgentBuilderTarget(context, TARGET);
		expect(context.logger?.warn).toHaveBeenCalledWith(
			expect.stringContaining('no thread persistence available'),
			expect.objectContaining({ agentId: TARGET.agentId }),
		);
	});

	it('propagates a metadata read failure instead of falling back to undefined', async () => {
		const threadMemory = createThreadMemory();
		threadMemory.getThread.mockRejectedValue(new Error('storage unavailable'));
		const context = createContext({ threadMemory });

		await expect(resolveAgentBuilderTarget(context)).rejects.toThrow('storage unavailable');
		expect(context.agentBuilderTarget).toBeUndefined();
	});

	it('clears the pending new-agent marker once a real agent binds, keeping other metadata', async () => {
		const threadMemory = createThreadMemory({
			[PENDING_AGENT_METADATA_KEY]: { projectId: 'project-1' },
			someOtherKey: 'keep me',
		});

		await saveAgentBuilderTarget(createContext({ threadMemory }), TARGET);

		const thread: ThreadRecord = await threadMemory.getThread();
		expect(thread.metadata).not.toHaveProperty(PENDING_AGENT_METADATA_KEY);
		expect(thread.metadata?.someOtherKey).toBe('keep me');
	});

	it('propagates a metadata write failure instead of claiming success', async () => {
		const threadMemory = createThreadMemory();
		threadMemory.patchThread.mockRejectedValue(new Error('storage unavailable'));
		const context = createContext({ threadMemory });

		await expect(saveAgentBuilderTarget(context, TARGET)).rejects.toThrow('storage unavailable');
	});

	describe('session agent registry', () => {
		it('saves then resolves by ref', async () => {
			const threadMemory = createThreadMemory();
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Support Triage',
				ref: 'support-triage',
			});

			await expect(
				getSessionAgentByRef(createContext({ threadMemory }), 'Support_Triage'),
			).resolves.toEqual({
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Support Triage',
				ref: 'support-triage',
			});
		});

		it('keeps the addressing ref when a later save changes only the display name', async () => {
			const threadMemory = createThreadMemory();
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Tracker',
				ref: 'tracker',
			});
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Renamed Tracker',
			});

			await expect(
				getSessionAgentByRef(createContext({ threadMemory }), 'tracker'),
			).resolves.toEqual({
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Renamed Tracker',
				ref: 'tracker',
			});
		});

		it('preserves the registered name when a later save for the same agent carries none', async () => {
			const threadMemory = createThreadMemory();
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Tracker',
				ref: 'tracker',
			});
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				ref: 'tracker',
			});

			await expect(
				getSessionAgentByRef(createContext({ threadMemory }), 'tracker'),
			).resolves.toEqual({
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Tracker',
				ref: 'tracker',
			});
			await expect(resolveAgentBuilderTarget(createContext({ threadMemory }))).resolves.toEqual({
				agentId: 'agent-1',
				projectId: 'p',
				name: 'Tracker',
				ref: 'tracker',
			});
		});

		it('returns undefined for unknown refs, missing persistence, and malformed registries', async () => {
			const threadMemory = createThreadMemory();
			await saveAgentBuilderTarget(createContext({ threadMemory }), {
				agentId: 'agent-1',
				projectId: 'p',
				name: 'First',
				ref: 'first',
			});
			await expect(
				getSessionAgentByRef(createContext({ threadMemory }), 'unknown'),
			).resolves.toBeUndefined();

			const noPersistence = createContext({ threadMemory: undefined, threadId: undefined });
			await expect(getSessionAgentByRef(noPersistence, 'first')).resolves.toBeUndefined();

			const malformed = createContext({
				threadMemory: createThreadMemory({ instanceAiAgentBuilderTargets: 'garbage' }),
			});
			await expect(getSessionAgentByRef(malformed, 'first')).resolves.toBeUndefined();
		});
	});
});

describe('agentBuilderTargetMetadata', () => {
	it('registers every target under its normalized ref, last one active', () => {
		const metadata = agentBuilderTargetMetadata([
			{ agentId: 'agent-1', projectId: 'p', ref: 'First Agent' },
			{ agentId: 'agent-2', projectId: 'p', ref: 'Second Agent' },
		]);

		expect(metadata.instanceAiAgentBuilderTarget).toMatchObject({ agentId: 'agent-2' });
		expect(metadata.instanceAiAgentBuilderTargets).toEqual({
			'first-agent': { agentId: 'agent-1', projectId: 'p', ref: 'first-agent' },
			'second-agent': { agentId: 'agent-2', projectId: 'p', ref: 'second-agent' },
		});
	});

	it('refuses two targets whose refs normalize to one key', () => {
		// Silently keeping the last would leave the other unaddressable, and a later
		// ref lookup would edit the surviving agent instead — the wrong one.
		expect(() =>
			agentBuilderTargetMetadata([
				{ agentId: 'agent-1', projectId: 'p', name: 'Support Bot', ref: 'Support Bot' },
				{ agentId: 'agent-2', projectId: 'p', name: 'support-bot', ref: 'support-bot' },
			]),
		).toThrow(/both address as "support-bot"/);
	});

	it('allows the same agent listed twice under one ref', () => {
		const metadata = agentBuilderTargetMetadata([
			{ agentId: 'agent-1', projectId: 'p', ref: 'Support Bot' },
			{ agentId: 'agent-1', projectId: 'p', ref: 'support bot' },
		]);
		expect(metadata.instanceAiAgentBuilderTargets).toEqual({
			'support-bot': { agentId: 'agent-1', projectId: 'p', ref: 'support-bot' },
		});
	});

	it('resolves through the same readers the product uses', async () => {
		// The point of the export: a thread seeded with this metadata addresses its
		// agent exactly as one that really built it does.
		const threadMemory = createThreadMemory(
			agentBuilderTargetMetadata([
				{ agentId: 'agent-1', projectId: 'p', name: 'Support Triage', ref: 'Support Triage' },
			]),
		);
		const context = createContext({ threadMemory });

		await expect(resolveAgentBuilderTarget(context)).resolves.toMatchObject({ agentId: 'agent-1' });
		await expect(getSessionAgentByRef(context, 'support triage')).resolves.toMatchObject({
			agentId: 'agent-1',
		});
	});
});

describe('seedAgentBuilderTargetMetadata', () => {
	/** One resolved `build-agent` call in a seeded assistant turn.
	 *
	 *  Each call stamps a LATER `createdAt` than the last, because real seeded
	 *  messages carry distinct ascending stamps and the scan orders by them. A
	 *  fixture that stamped them all identically would only ever be exercising the
	 *  id tiebreak. */
	let turnSeq = 0;
	function buildAgentTurn(agentId: string, agentRef: string) {
		turnSeq += 1;
		return {
			id: `msg-${String(turnSeq).padStart(3, '0')}-${agentId}`,
			type: 'llm',
			role: 'assistant',
			createdAt: `2026-01-01T00:00:${String(turnSeq).padStart(2, '0')}.000Z`,
			content: [
				{
					type: 'tool-call',
					toolCallId: `tc-${agentId}`,
					toolName: 'build-agent',
					state: 'resolved',
					output: { ok: true, agentId, agentRef },
				},
			],
		};
	}

	const AGENTS = [
		{ agentId: 'agent-1', projectId: 'p', name: 'Support Triage', ref: 'Support Triage' },
		{ agentId: 'agent-2', projectId: 'p', name: 'Billing Bot', ref: 'Billing Bot' },
	];

	it('uses the ref the model authored, not the display name', () => {
		// The live turn addresses the agent with the ref its own history carries; a
		// name-derived ref means the first `build-agent` call misses the registry.
		const metadata = seedAgentBuilderTargetMetadata(AGENTS, [
			buildAgentTurn('agent-1', 'triage'),
			buildAgentTurn('agent-2', 'billing'),
		]);

		expect(metadata.instanceAiAgentBuilderTargets).toMatchObject({
			triage: { agentId: 'agent-1' },
			billing: { agentId: 'agent-2' },
		});
	});

	it('makes the LAST targeted agent active, regardless of seed array order', () => {
		// Array order is an authoring artifact. "Most recently targeted" is what the
		// conversation actually did, so it has to come from the tool calls.
		const metadata = seedAgentBuilderTargetMetadata(AGENTS, [
			buildAgentTurn('agent-2', 'billing'),
			buildAgentTurn('agent-1', 'triage'),
		]);

		expect(metadata.instanceAiAgentBuilderTarget).toMatchObject({ agentId: 'agent-1' });
	});

	it('re-targeting an agent later moves it back to active', () => {
		const metadata = seedAgentBuilderTargetMetadata(AGENTS, [
			buildAgentTurn('agent-1', 'triage'),
			buildAgentTurn('agent-2', 'billing'),
			buildAgentTurn('agent-1', 'triage'),
		]);

		expect(metadata.instanceAiAgentBuilderTarget).toMatchObject({ agentId: 'agent-1' });
	});

	it('falls back to the display name for an agent the history never targeted', () => {
		// A hand-authored seed may carry an agent with no build-agent record at all.
		const metadata = seedAgentBuilderTargetMetadata(AGENTS, [buildAgentTurn('agent-2', 'billing')]);

		expect(metadata.instanceAiAgentBuilderTargets).toMatchObject({
			'support-triage': { agentId: 'agent-1' },
			billing: { agentId: 'agent-2' },
		});
		// Untargeted agents sort first, so they can't displace the real active target.
		expect(metadata.instanceAiAgentBuilderTarget).toMatchObject({ agentId: 'agent-2' });
	});

	it('orders by createdAt, not array order', () => {
		// The restore sorts messages by `createdAt` and so does every read, so an
		// authored array in a different order would pick the wrong active target.
		const later = buildAgentTurn('agent-1', 'triage');
		later.createdAt = '2026-01-01T00:00:09.000Z';
		const earlier = buildAgentTurn('agent-2', 'billing');
		earlier.createdAt = '2026-01-01T00:00:01.000Z';

		// Authored newest-first; chronologically agent-1 is the most recent target.
		const metadata = seedAgentBuilderTargetMetadata(AGENTS, [later, earlier]);

		expect(metadata.instanceAiAgentBuilderTarget).toMatchObject({ agentId: 'agent-1' });
	});

	it('tiebreaks a shared timestamp by id, like the store does', () => {
		// `listMessages` orders by (createdAt, id), so stopping at createdAt would
		// leave the active target undefined exactly when two turns share a stamp.
		const a = buildAgentTurn('agent-1', 'triage');
		const b = buildAgentTurn('agent-2', 'billing');
		a.id = 'msg-b';
		b.id = 'msg-a';
		a.createdAt = '2026-01-01T00:00:00.000Z';
		b.createdAt = '2026-01-01T00:00:00.000Z';

		// Authored a-then-b, but by id b sorts first, so agent-1 is the last target.
		const metadata = seedAgentBuilderTargetMetadata(AGENTS, [a, b]);

		expect(metadata.instanceAiAgentBuilderTarget).toMatchObject({ agentId: 'agent-1' });
	});

	it('ignores a build-agent call whose output carries no agent id', () => {
		// A failed call ("agent builder is not configured") records no identity.
		const metadata = seedAgentBuilderTargetMetadata(AGENTS.slice(0, 1), [
			{
				id: 'msg-failed',
				type: 'llm',
				role: 'assistant',
				createdAt: '2026-01-01T00:00:00.000Z',
				content: [
					{ type: 'tool-call', toolName: 'build-agent', state: 'resolved', output: { ok: false } },
				],
			},
		]);

		expect(metadata.instanceAiAgentBuilderTargets).toMatchObject({
			'support-triage': { agentId: 'agent-1' },
		});
	});
});

describe('clearedAgentBuilderTargetMetadata', () => {
	it('clears both binding keys while keeping unrelated metadata', async () => {
		// `updateThread` MERGES, so a rollback that hands back only the prior snapshot
		// leaves the thread bound to agents a failed restore already deleted.
		const bound = seedAgentBuilderTargetMetadata(
			[{ agentId: 'agent-1', projectId: 'p', name: 'Support Triage', ref: 'Support Triage' }],
			[],
		);
		const prior = { somethingElse: 'keep me' };

		const merged: Record<string, unknown> = {
			...prior,
			...bound,
			...clearedAgentBuilderTargetMetadata(prior),
		};

		expect(merged.somethingElse).toBe('keep me');
		expect(merged.instanceAiAgentBuilderTarget).toBeUndefined();
		expect(merged.instanceAiAgentBuilderTargets).toBeUndefined();
		// And it resolves as no binding through the real reader.
		const context = createContext({ threadMemory: createThreadMemory(merged) });
		await expect(resolveAgentBuilderTarget(context)).resolves.toBeUndefined();
	});

	it('restores a binding the thread already had before the seed wrote one', () => {
		const existing = agentBuilderTargetMetadata([
			{ agentId: 'agent-old', projectId: 'p', ref: 'old' },
		]);

		const restored = clearedAgentBuilderTargetMetadata(existing);

		expect(restored.instanceAiAgentBuilderTarget).toEqual(existing.instanceAiAgentBuilderTarget);
	});
});

describe('withBoundAgentTarget', () => {
	it('replaces the pending marker rather than leaving both standing', () => {
		const metadata = withBoundAgentTarget(
			{ [PENDING_AGENT_METADATA_KEY]: { agentId: 'agent-1', projectId: 'project-1' } },
			TARGET,
		);

		expect(metadata[PENDING_AGENT_METADATA_KEY]).toBeUndefined();
		expect(metadata.instanceAiAgentBuilderTarget).toEqual(TARGET);
	});

	it('registers the target under its normalized ref so it stays addressable', () => {
		const metadata = withBoundAgentTarget({}, { ...TARGET, ref: 'Support Triage' });

		expect(metadata.instanceAiAgentBuilderTargets).toEqual({
			'support-triage': { ...TARGET, ref: 'support-triage' },
		});
	});

	it('leaves unrelated metadata alone', () => {
		const metadata = withBoundAgentTarget({ creditsUsed: 3 }, TARGET);

		expect(metadata.creditsUsed).toBe(3);
	});
});

describe('threadAuthorizesAgentAdoption', () => {
	const target = { agentId: 'agent-1', projectId: 'project-1' };

	it('accepts the pending marker the frontend wrote for this artifact', () => {
		expect(threadAuthorizesAgentAdoption({ [PENDING_AGENT_METADATA_KEY]: target }, target)).toBe(
			true,
		);
	});

	// Whichever writer binds first deletes the pending marker, so the loser
	// converging afterwards has only the active binding to prove itself with.
	it('accepts the active binding once the pending marker is gone', () => {
		expect(threadAuthorizesAgentAdoption(withBoundAgentTarget({}, { ...target }), target)).toBe(
			true,
		);
	});

	it('rejects a thread with no agent lifecycle metadata', () => {
		expect(threadAuthorizesAgentAdoption(undefined, target)).toBe(false);
		expect(threadAuthorizesAgentAdoption({}, target)).toBe(false);
	});

	it('rejects a different agent or a different project', () => {
		const pending = { [PENDING_AGENT_METADATA_KEY]: target };

		expect(threadAuthorizesAgentAdoption(pending, { ...target, agentId: 'agent-2' })).toBe(false);
		expect(threadAuthorizesAgentAdoption(pending, { ...target, projectId: 'project-2' })).toBe(
			false,
		);
	});

	it('rejects a session registry entry that was never the active target', () => {
		const metadata = agentBuilderTargetMetadata([
			{ agentId: 'agent-other', projectId: 'project-1', ref: 'other' },
		]);

		expect(threadAuthorizesAgentAdoption(metadata, target)).toBe(false);
	});

	it('rejects malformed metadata instead of throwing', () => {
		expect(threadAuthorizesAgentAdoption({ [PENDING_AGENT_METADATA_KEY]: 'nope' }, target)).toBe(
			false,
		);
		expect(threadAuthorizesAgentAdoption({ instanceAiAgentBuilderTarget: 7 }, target)).toBe(false);
	});
});
