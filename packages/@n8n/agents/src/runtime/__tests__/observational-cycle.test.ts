import { z } from 'zod';

import { AgentEvent } from '../../types';
import type { AgentDbMessage } from '../../types/sdk/message';
import {
	OBSERVATION_SCHEMA_VERSION,
	type CompactFn,
	type NewObservation,
	type ObserveFn,
} from '../../types/sdk/observation';
import { AgentEventBus } from '../event-bus';
import { InMemoryMemory, saveMessagesToThread } from '../memory-store';
import {
	DEFAULT_COMPACTOR_PROMPT,
	DEFAULT_OBSERVER_PROMPT,
	runObservationalCycle,
	type RunObservationalCycleOpts,
} from '../observational-cycle';

type GenerateTextCall = { model: unknown; system?: string; prompt?: string };
const mockGenerateText = jest.fn<Promise<{ text: string }>, [GenerateTextCall]>();

jest.mock('ai', () => ({
	generateText: async (call: GenerateTextCall): Promise<{ text: string }> =>
		await mockGenerateText(call),
}));

function msg(
	id: string,
	text: string,
	createdAt = new Date(),
	role: 'user' | 'assistant' = 'user',
): AgentDbMessage {
	return { id, createdAt, role, content: [{ type: 'text', text }] };
}

function row(text: string): NewObservation {
	return {
		scopeKind: 'thread',
		scopeId: 't-1',
		kind: 'observation',
		payload: { text },
		durationMs: null,
		schemaVersion: OBSERVATION_SCHEMA_VERSION,
		createdAt: new Date(),
	};
}

async function save(mem: InMemoryMemory, messages: AgentDbMessage[]) {
	await saveMessagesToThread(mem, 't-1', 'u-1', messages);
}

function opts(
	mem: InMemoryMemory,
	overrides: Partial<RunObservationalCycleOpts> = {},
): RunObservationalCycleOpts {
	return {
		memory: mem,
		threadId: 't-1',
		resourceId: 'u-1',
		model: { doGenerate: jest.fn() } as never,
		workingMemory: { template: '# Thread memory', structured: false },
		observe: async () => {
			await Promise.resolve();
			return [];
		},
		compactionThreshold: 5,
		...overrides,
	};
}

describe('runObservationalCycle', () => {
	beforeEach(() => {
		mockGenerateText.mockReset();
	});

	it('runs the observer over the message delta and advances the cursor', async () => {
		const mem = new InMemoryMemory();
		await save(mem, [msg('m1', 'remember that I prefer concise answers')]);
		const observe = jest.fn<ReturnType<ObserveFn>, Parameters<ObserveFn>>(async (ctx) => {
			await Promise.resolve();
			expect(ctx.deltaMessages.map((m) => m.id)).toEqual(['m1']);
			expect(ctx.currentWorkingMemory).toBeNull();
			expect(ctx.threadId).toBe('t-1');
			return [row('User prefers concise answers.')];
		});

		const result = await runObservationalCycle(opts(mem, { observe }));

		expect(result).toEqual({ status: 'ran', observationsWritten: 1, compacted: false });
		expect(observe).toHaveBeenCalledTimes(1);
		const rows = await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(rows.map((r) => r.payload)).toEqual([{ text: 'User prefers concise answers.' }]);
		const cursor = await mem.getCursor('thread', 't-1');
		expect(cursor?.lastObservedMessageId).toBe('m1');
	});

	it('compacts queued observations into thread working memory at the threshold', async () => {
		const mem = new InMemoryMemory();
		await save(mem, [msg('m1', 'my project is Memory v1')]);
		await mem.saveWorkingMemory(
			{ threadId: 't-1', resourceId: 'u-1', scope: 'thread' },
			'# Thread memory\n- Current project:',
		);
		const compact = jest.fn<ReturnType<CompactFn>, Parameters<CompactFn>>(async (ctx) => {
			await Promise.resolve();
			expect(ctx.observations).toHaveLength(1);
			expect(ctx.currentWorkingMemory).toContain('Current project');
			return { content: '# Thread memory\n- Current project: Memory v1' };
		});

		const result = await runObservationalCycle(
			opts(mem, {
				observe: async () => {
					await Promise.resolve();
					return [row('Current project is Memory v1.')];
				},
				compact,
				compactionThreshold: 1,
			}),
		);

		expect(result).toMatchObject({ status: 'ran', compacted: true });
		expect(
			await mem.getWorkingMemory({ threadId: 't-1', resourceId: 'u-1', scope: 'thread' }),
		).toBe('# Thread memory\n- Current project: Memory v1');
		expect(await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' })).toEqual([]);
	});

	it('does not compact below the threshold', async () => {
		const mem = new InMemoryMemory();
		await save(mem, [msg('m1', 'one')]);
		const compact = jest.fn<ReturnType<CompactFn>, Parameters<CompactFn>>();

		const result = await runObservationalCycle(
			opts(mem, {
				observe: async () => {
					await Promise.resolve();
					return [row('one')];
				},
				compact,
				compactionThreshold: 2,
			}),
		);

		expect(result).toMatchObject({ status: 'ran', compacted: false });
		expect(compact).not.toHaveBeenCalled();
	});

	it('adds a gap row for idle-timer triggers when the elapsed gap crosses the bound', async () => {
		const mem = new InMemoryMemory();
		const first = new Date('2026-05-07T10:00:00.000Z');
		const second = new Date('2026-05-07T12:30:00.000Z');
		await save(mem, [msg('m1', 'first', first)]);
		await runObservationalCycle(opts(mem));
		await save(mem, [msg('m2', 'later', second)]);

		await runObservationalCycle(
			opts(mem, {
				trigger: { type: 'idle-timer', idleMs: 1, gapThresholdMs: 60 * 60 * 1000 },
			}),
		);

		const rows = await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(rows).toHaveLength(1);
		expect(rows[0].kind).toBe('gap');
		expect(rows[0].durationMs).toBe(2.5 * 60 * 60 * 1000);
	});

	it('adds a gap row for per-turn triggers when the elapsed gap crosses the default bound', async () => {
		const mem = new InMemoryMemory();
		const first = new Date('2026-05-07T10:00:00.000Z');
		const second = new Date('2026-05-07T11:30:00.000Z');
		await save(mem, [msg('m1', 'first', first)]);
		await runObservationalCycle(opts(mem));
		await save(mem, [msg('m2', 'later', second)]);

		const observe = jest.fn<ReturnType<ObserveFn>, Parameters<ObserveFn>>(async (ctx) => {
			await Promise.resolve();
			expect(ctx.gap).toMatchObject({
				durationMs: 90 * 60 * 1000,
				text: 'User returned after 1h 30m of inactivity.',
				previousObservedAt: first,
				nextMessageAt: second,
			});
			return [];
		});

		const result = await runObservationalCycle(opts(mem, { observe }));

		expect(result).toEqual({ status: 'ran', observationsWritten: 1, compacted: false });
		const rows = await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			kind: 'gap',
			payload: {
				category: 'continuity',
				text: 'User returned after 1h 30m of inactivity.',
			},
			durationMs: 90 * 60 * 1000,
			createdAt: second,
		});
	});

	it('uses neutral gap text when the first post-gap message is not from the user', async () => {
		const mem = new InMemoryMemory();
		const first = new Date('2026-05-07T10:00:00.000Z');
		const second = new Date('2026-05-07T12:00:00.000Z');
		await save(mem, [msg('m1', 'first', first)]);
		await runObservationalCycle(opts(mem));
		await save(mem, [msg('m2', 'later', second, 'assistant')]);

		let observedGap: Parameters<ObserveFn>[0]['gap'] = null;
		const observe = jest.fn<ReturnType<ObserveFn>, Parameters<ObserveFn>>(async (ctx) => {
			observedGap = ctx.gap;
			return await Promise.resolve([]);
		});

		await runObservationalCycle(opts(mem, { observe }));

		expect(observedGap).toMatchObject({
			durationMs: 2 * 60 * 60 * 1000,
			text: 'Conversation continued after 2h of inactivity.',
			previousObservedAt: first,
			nextMessageAt: second,
		});
		const rows = await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			kind: 'gap',
			payload: {
				category: 'continuity',
				text: 'Conversation continued after 2h of inactivity.',
			},
			createdAt: second,
		});
	});

	it('does not add gap rows on first observation or below the configured bound', async () => {
		const mem = new InMemoryMemory();
		const first = new Date('2026-05-07T10:00:00.000Z');
		const second = new Date('2026-05-07T10:30:00.000Z');
		await save(mem, [msg('m1', 'first', first)]);

		await runObservationalCycle(opts(mem));
		expect(await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' })).toEqual([]);

		await save(mem, [msg('m2', 'later', second)]);
		await runObservationalCycle(opts(mem, { gapThresholdMs: 60 * 60 * 1000 }));

		expect(await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' })).toEqual([]);
	});

	it('does not count gap rows toward compaction but includes them when observations trigger it', async () => {
		const mem = new InMemoryMemory();
		const first = new Date('2026-05-07T10:00:00.000Z');
		const second = new Date('2026-05-07T12:00:00.000Z');
		const third = new Date('2026-05-07T12:05:00.000Z');
		await save(mem, [msg('m1', 'first', first)]);
		await runObservationalCycle(opts(mem));
		await save(mem, [msg('m2', 'later', second)]);

		const compact = jest.fn<ReturnType<CompactFn>, Parameters<CompactFn>>(async () => {
			await Promise.resolve();
			return { content: '# Thread memory\n- Continuity notes: user returned after a gap' };
		});

		await runObservationalCycle(opts(mem, { compact, compactionThreshold: 1 }));
		expect(compact).not.toHaveBeenCalled();
		expect(await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' })).toHaveLength(1);

		await save(mem, [msg('m3', 'remember this decision', third)]);
		await runObservationalCycle(
			opts(mem, {
				observe: async () => {
					await Promise.resolve();
					return [row('Decision was recorded.')];
				},
				compact,
				compactionThreshold: 1,
			}),
		);

		expect(compact).toHaveBeenCalledTimes(1);
		expect(compact.mock.calls[0][0].observations.map((observation) => observation.kind)).toEqual([
			'gap',
			'observation',
		]);
		expect(await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' })).toEqual([]);
	});

	it('parses categorized default observer output and preserves legacy text rows', async () => {
		const mem = new InMemoryMemory();
		await save(mem, [msg('m1', 'I prefer terse answers')]);
		mockGenerateText.mockResolvedValue({
			text: [
				'{"kind":"observation","category":"preferences","text":"User prefers terse answers."}',
				'{"kind":"observation","text":"Legacy row stays readable."}',
				'{"kind":"gap","category":"continuity","text":"Model-emitted gap is stored as an observation."}',
			].join('\n'),
		});

		await runObservationalCycle(opts(mem, { observe: undefined }));

		const rows = await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' });
		expect(rows.map((observation) => observation.kind)).toEqual([
			'observation',
			'observation',
			'observation',
		]);
		expect(rows.map((observation) => observation.payload)).toEqual(
			expect.arrayContaining([
				{ category: 'preferences', text: 'User prefers terse answers.' },
				{ category: 'other', text: 'Legacy row stays readable.' },
				{ category: 'continuity', text: 'Model-emitted gap is stored as an observation.' },
			]),
		);
	});

	it('injects gap and timestamp context into the default observer prompt', async () => {
		const mem = new InMemoryMemory();
		const first = new Date('2026-05-07T10:00:00.000Z');
		const second = new Date('2026-05-07T12:00:00.000Z');
		await save(mem, [msg('m1', 'first', first)]);
		await runObservationalCycle(opts(mem));
		await save(mem, [msg('m2', 'later', second)]);
		mockGenerateText.mockResolvedValue({ text: '' });

		await runObservationalCycle(opts(mem, { observe: undefined }));

		const call = mockGenerateText.mock.calls[0][0];
		expect(call.system).toBe(DEFAULT_OBSERVER_PROMPT);
		expect(call.system).toContain('category');
		expect(call.system).toContain('Do not record assistant-only uncertainty');
		expect(call.system).toContain(
			'Record a follow-up or active item only when the user asks for it',
		);
		expect(call.system).toContain('User messages are authoritative');
		expect(call.system).toContain('A normal assistant reply is not verification evidence');
		expect(call.system).toContain('Do not record assistant-created checklists');
		expect(call.system).toContain('Assistant statements like "we should check X"');
		expect(call.system).toContain('which file/table handles Y?');
		expect(call.system).toContain('Do not record assistant self-assessments');
		expect(call.system).toContain('memory drawer shows it');
		expect(call.system).toContain('the test passed');
		expect(call.system).not.toContain('Do not treat assistant acknowledgements');
		expect(call.system).not.toContain('actions performed by the main agent');
		expect(call.system).toContain('Do not emit temporal-gap rows');
		expect(call.prompt).toContain('Computed temporal gap:');
		expect(call.prompt).toContain('User returned after 2h of inactivity.');
		expect(call.prompt).toContain('[2026-05-07T12:00:00.000Z] [user] later');
	});

	it('groups queued rows with timestamps and durations in the default compactor prompt', async () => {
		const mem = new InMemoryMemory();
		const first = new Date('2026-05-07T10:00:00.000Z');
		const second = new Date('2026-05-07T12:00:00.000Z');
		await save(mem, [msg('m1', 'first', first)]);
		await runObservationalCycle(opts(mem));
		await save(mem, [msg('m2', 'later', second)]);
		mockGenerateText
			.mockResolvedValueOnce({
				text: '{"kind":"observation","category":"decisions","text":"Decision: tune memory prompts."}',
			})
			.mockResolvedValueOnce({ text: '# Thread memory\n- Decisions made: tune memory prompts' });

		await runObservationalCycle(opts(mem, { observe: undefined, compactionThreshold: 1 }));

		const compactorCall = mockGenerateText.mock.calls[1][0];
		expect(compactorCall.system).toBe(DEFAULT_COMPACTOR_PROMPT);
		expect(compactorCall.system).toContain(
			'Do not delete useful thread context merely because it is old',
		);
		expect(compactorCall.system).toContain('Preserve the template structure');
		expect(compactorCall.system).toContain(
			'Remove claims that this memory is available in other sessions, new threads, or cross-thread profiles',
		);
		expect(compactorCall.system).toContain('Do not write assistant self-assessments');
		expect(compactorCall.system).toContain('memory worked');
		expect(compactorCall.system).toContain('A queued row based only on an assistant claim');
		expect(compactorCall.system).toContain('Prune assistant-originated debugging scaffolding');
		expect(compactorCall.system).toContain('memory drawer shows it');
		expect(compactorCall.system).toContain('Open follow-ups must be user-requested');
		expect(compactorCall.system).toContain(
			'Remove existing follow-ups that came only from assistant questions',
		);
		expect(compactorCall.system).not.toContain('The observer owns memory updates');
		expect(compactorCall.system).not.toContain('Which DB schema is Robin using?');
		expect(compactorCall.prompt).toContain('### continuity / gap');
		expect(compactorCall.prompt).toContain('duration=2h');
		expect(compactorCall.prompt).toContain('### decisions / observation');
		expect(compactorCall.prompt).toContain('[2026-05-07T12:00:00.000Z]');
	});

	it('validates structured compactor output before saving and deleting observations', async () => {
		const mem = new InMemoryMemory();
		const eventBus = new AgentEventBus();
		const errors: string[] = [];
		eventBus.on(AgentEvent.Error, (event) => {
			if (event.type === AgentEvent.Error) errors.push(event.message);
		});
		await save(mem, [msg('m1', 'Alice')]);

		const result = await runObservationalCycle(
			opts(mem, {
				workingMemory: {
					template: '{"name": ""}',
					structured: true,
					schema: z.object({ name: z.string() }),
				},
				observe: async () => {
					await Promise.resolve();
					return [row('Name is Alice.')];
				},
				compact: async () => {
					await Promise.resolve();
					return { content: '{"name": 123}' };
				},
				compactionThreshold: 1,
				eventBus,
			}),
		);

		expect(result).toMatchObject({ status: 'ran', compacted: false });
		expect(errors[0]).toContain('does not match schema');
		expect(await mem.getObservations({ scopeKind: 'thread', scopeId: 't-1' })).toHaveLength(1);
		expect(
			await mem.getWorkingMemory({ threadId: 't-1', resourceId: 'u-1', scope: 'thread' }),
		).toBeNull();
	});

	it('emits observer errors without throwing', async () => {
		const mem = new InMemoryMemory();
		const eventBus = new AgentEventBus();
		const errors: string[] = [];
		eventBus.on(AgentEvent.Error, (event) => {
			if (event.type === AgentEvent.Error) errors.push(event.message);
		});
		await save(mem, [msg('m1', 'hello')]);

		const result = await runObservationalCycle(
			opts(mem, {
				observe: async () => {
					await Promise.resolve();
					throw new Error('observer failed');
				},
				eventBus,
			}),
		);

		expect(result).toEqual({ status: 'skipped', reason: 'no-delta' });
		expect(errors).toEqual(['observer failed']);
	});
});
