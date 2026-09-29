import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type * as AiImport from 'ai';

import type { ObservationLogEntry } from '../../types/sdk/observation-log';
import type { BuiltTelemetry } from '../../types/telemetry';
import { InMemoryMemory } from '../memory/memory-store';
import {
	buildObservationLogReflectorPrompt,
	createObservationLogReflectFn,
	DEFAULT_OBSERVATION_LOG_REFLECTOR_THRESHOLD_TOKENS,
} from '../memory/observation-log-defaults';
import {
	normalizeObservationLogReflection,
	parseObservationLogReflectionJson,
	renderObservationLogForReflection,
	runObservationLogReflector,
} from '../memory/observation-log-reflector';
import { renderObservationLog } from '../memory/observation-log-renderer';

type GenerateTextCall = Record<string, unknown>;
type GenerateTextResult = {
	text: string;
	usage?: { totalTokens?: number; inputTokens?: number; outputTokens?: number };
};

const { mockGenerateText } = vi.hoisted(() => ({
	mockGenerateText: vi.fn<(...args: [GenerateTextCall]) => Promise<GenerateTextResult>>(),
}));

vi.mock('ai', async () => {
	const actual = await vi.importActual<typeof AiImport>('ai');
	return {
		...actual,
		generateText: async (call: GenerateTextCall): Promise<GenerateTextResult> =>
			await mockGenerateText(call),
	};
});

function observation(overrides: Partial<ObservationLogEntry> = {}): ObservationLogEntry {
	return {
		id: overrides.id ?? crypto.randomUUID(),
		observationScopeId: overrides.observationScopeId ?? 'thread-1',
		marker: overrides.marker ?? 'important',
		text: overrides.text ?? 'Observation',
		parentId: overrides.parentId ?? null,
		tokenCount: overrides.tokenCount ?? 1,
		status: overrides.status ?? 'active',
		supersededBy: overrides.supersededBy ?? null,
		createdAt: overrides.createdAt ?? new Date('2026-05-12T14:30:00.000Z'),
	};
}

describe('observation-log reflector defaults', () => {
	beforeEach(() => {
		mockGenerateText.mockReset();
	});

	it('keeps the default reflector threshold in the SDK', () => {
		expect(DEFAULT_OBSERVATION_LOG_REFLECTOR_THRESHOLD_TOKENS).toBe(60_000);
	});

	it('maps model references back to stored entries and keeps the merged result visible', async () => {
		const store = new InMemoryMemory();
		const workflowId = 'cc8f2bf2-9261-4f3b-a54e-82136b35582e';
		const [noise, context, stale, oldDecision, newDecision] =
			await store.appendObservationLogEntries([
				{
					observationScopeId: 'thread-1',
					marker: 'info',
					text: 'Old progress.',
					tokenCount: 2,
					createdAt: new Date('2026-05-12T13:00:00Z'),
				},
				{
					observationScopeId: 'thread-1',
					marker: 'info',
					text: `Workflow ${workflowId} receives orders.`,
					tokenCount: 4,
					createdAt: new Date('2026-05-12T14:00:00Z'),
				},
				{
					observationScopeId: 'thread-1',
					marker: 'info',
					text: 'Repeated acknowledgment.',
					tokenCount: 2,
					createdAt: new Date('2026-05-12T14:01:00Z'),
				},
				{
					observationScopeId: 'thread-1',
					marker: 'critical',
					text: 'Postgres was the target.',
					tokenCount: 2,
					createdAt: new Date('2026-05-12T14:02:00Z'),
				},
				{
					observationScopeId: 'thread-1',
					marker: 'critical',
					text: 'SQLite is the new target.',
					tokenCount: 2,
					createdAt: new Date('2026-05-12T14:04:00Z'),
				},
			]);
		const [child] = await store.appendObservationLogEntries([
			{
				observationScopeId: 'thread-1',
				marker: 'completion',
				text: 'Target review finished; migration is pending.',
				parentId: oldDecision.id,
				tokenCount: 1,
				createdAt: new Date('2026-05-12T14:03:00Z'),
			},
		]);
		const mergedText = `Workflow ${workflowId} now targets SQLite instead of Postgres; migration is pending.`;
		mockGenerateText.mockResolvedValue({
			text: JSON.stringify({
				drop: ['3'],
				merge: [{ supersedes: ['4', '6'], marker: 'CRITICAL', text: mergedText, parentId: '2' }],
			}),
		});

		const result = await runObservationLogReflector({
			memory: store,
			observationScopeId: 'thread-1',
			reflectorThresholdTokens: 1,
			reflect: createObservationLogReflectFn('openai/gpt-4o-mini'),
			tokenCounter: async () => await Promise.resolve(2),
			now: new Date('2026-05-12T15:00:00Z'),
		});

		const request = mockGenerateText.mock.calls[0][0].prompt;
		expect(request).toContain(
			`[2] INFO 2026-05-12T14:00:00.000Z Workflow ${workflowId} receives orders.`,
		);
		expect(request).toContain('  * [5] COMPLETION 2026-05-12T14:03:00.000Z Target review finished');
		for (const source of [noise, context, stale, oldDecision, child, newDecision]) {
			expect(request).not.toContain(source.id);
		}
		expect(result).toMatchObject({
			status: 'ran',
			result: {
				droppedIds: [stale.id],
				supersededIds: [oldDecision.id, child.id, newDecision.id],
			},
		});
		const active = await store.getActiveObservationLog({ observationScopeId: 'thread-1' });
		expect(active).toEqual([
			expect.objectContaining({ id: noise.id }),
			expect.objectContaining({ id: context.id }),
			expect.objectContaining({
				marker: 'critical',
				text: mergedText,
				parentId: context.id,
				tokenCount: 2,
			}),
		]);
		const rendered = renderObservationLog(active, { renderTokenBudget: 6 });
		expect(rendered).toContain(context.text);
		expect(rendered).toContain(mergedText);
		expect(rendered).not.toContain(noise.text);
	});

	it.each([
		['drop', '{"drop":["1","9"],"merge":[]}'],
		[
			'supersedes',
			'{"drop":["1"],"merge":[{"supersedes":["9"],"marker":"IMPORTANT","text":"Replacement"}]}',
		],
		[
			'parentId',
			'{"drop":[],"merge":[{"supersedes":["1"],"marker":"IMPORTANT","text":"Replacement","parentId":"9"}]}',
		],
		['invalid JSON', 'not JSON'],
	])('leaves the log unchanged for an invalid %s response', async (_field, output) => {
		const store = new InMemoryMemory();
		const before = await store.appendObservationLogEntries([
			{
				observationScopeId: 'thread-1',
				marker: 'important',
				text: 'Keep this fact.',
				tokenCount: 2,
			},
		]);
		mockGenerateText.mockResolvedValue({ text: output });

		await expect(
			runObservationLogReflector({
				memory: store,
				observationScopeId: 'thread-1',
				reflectorThresholdTokens: 1,
				reflect: createObservationLogReflectFn('openai/gpt-4o-mini'),
			}),
		).rejects.toThrow();
		await expect(store.getObservationLog({ observationScopeId: 'thread-1' })).resolves.toEqual(
			before,
		);
	});

	it('keeps deterministic reference maps separate across overlapping calls', async () => {
		const firstResponse = createDeferredPromise<GenerateTextResult>();
		const secondResponse = createDeferredPromise<GenerateTextResult>();
		mockGenerateText
			.mockReturnValueOnce(firstResponse.promise)
			.mockReturnValueOnce(secondResponse.promise);
		const reflect = createObservationLogReflectFn('openai/gpt-4o-mini');
		const first = observation({ id: 'first' });
		const later = observation({ id: 'later', createdAt: new Date('2026-05-12T14:31:00Z') });
		const inactive = observation({
			id: 'inactive',
			status: 'superseded',
			createdAt: new Date('2026-05-12T14:29:00Z'),
		});
		const second = observation({ id: 'second', observationScopeId: 'thread-2' });
		const firstEntries = [later, inactive, first];
		const input = {
			observationScopeId: 'thread-1',
			now: new Date('2026-05-12T15:00:00Z'),
			activeObservationLog: firstEntries,
			renderedObservationLog: renderObservationLogForReflection(firstEntries),
			tokenCount: 2,
			tokenBudget: 1,
		};

		const firstCall = reflect(input);
		const secondCall = reflect({
			...input,
			observationScopeId: 'thread-2',
			activeObservationLog: [second],
			renderedObservationLog: renderObservationLogForReflection([second]),
		});
		await vi.waitFor(() => expect(mockGenerateText).toHaveBeenCalledTimes(2));
		secondResponse.resolve({ text: '{"drop":["1"],"merge":[]}' });
		// The default reflect fn returns { text, usage, model }; extract the text
		// before parsing the reflection JSON.
		const secondResult = await secondCall;
		const secondText = typeof secondResult === 'string' ? secondResult : secondResult.text;
		expect(parseObservationLogReflectionJson(secondText)).toEqual({
			drop: [second.id],
			merge: [],
		});
		firstResponse.resolve({ text: '{"drop":["1"],"merge":[]}' });
		const firstResult = await firstCall;
		const firstText = typeof firstResult === 'string' ? firstResult : firstResult.text;
		expect(parseObservationLogReflectionJson(firstText)).toEqual({
			drop: [first.id],
			merge: [],
		});
	});

	it('builds the default reflector prompt from active log and token budget', () => {
		const prompt = buildObservationLogReflectorPrompt({
			observationScopeId: 'thread-1',
			now: new Date('2026-05-12T15:00:00.000Z'),
			activeObservationLog: [],
			renderedObservationLog:
				'* [obs-1] CRITICAL 2026-05-12T14:30:00.000Z User chose observation-log memory.',
			tokenCount: 42,
			tokenBudget: 8_000,
		});

		expect(prompt).toContain('Current timestamp: 2026-05-12T15:00:00.000Z');
		expect(prompt).not.toContain('Scope:');
		expect(prompt).toContain('Active observation log tokens: 42');
		expect(prompt).toContain('Token budget: 8000');
		expect(prompt).toContain('[obs-1] CRITICAL');
	});

	it('counts reflector generation tokens when usage is available', async () => {
		mockGenerateText.mockResolvedValue({
			text: '{"drop":[],"merge":[]}',
			usage: { totalTokens: 19 },
		});
		const counter = {
			incrementMessageCount: vi.fn(),
			incrementToolCallCount: vi.fn(),
			incrementTokenCount: vi.fn(),
		};

		const result = await createObservationLogReflectFn('openai/gpt-4o-mini')({
			observationScopeId: 'thread-1',
			now: new Date('2026-05-12T14:30:00.000Z'),
			activeObservationLog: [],
			renderedObservationLog: '* [obs-1] INFO 2026-05-12T14:30:00.000Z Small detail',
			tokenCount: 10,
			tokenBudget: 4_000,
			executionCounter: counter,
		});

		// The default reflect fn returns { text, usage, model }; bare-string returns
		// stay supported for custom reflect fns.
		const reflectText = typeof result === 'string' ? result : result.text;
		expect(reflectText).toBe('{"drop":[],"merge":[]}');
		expect(counter.incrementTokenCount).toHaveBeenCalledWith(19);
		expect(counter.incrementMessageCount).not.toHaveBeenCalled();
		expect(counter.incrementToolCallCount).not.toHaveBeenCalled();
	});

	it('threads input.telemetry into generateText as a memory-reflector-suffixed call, omitting it when disabled or absent', async () => {
		mockGenerateText.mockResolvedValue({ text: '{"drop":[],"merge":[]}' });
		const reflect = createObservationLogReflectFn('openai/gpt-4o-mini');
		const baseInput = {
			observationScopeId: 'thread-1',
			now: new Date('2026-05-12T14:30:00.000Z'),
			activeObservationLog: [],
			renderedObservationLog: '',
			tokenCount: 10,
			tokenBudget: 12_000,
		};
		const telemetry: BuiltTelemetry = {
			enabled: true,
			functionId: 'my-agent',
			metadata: { thread_id: 't1' },
			recordInputs: true,
			recordOutputs: false,
			integrations: [],
		};

		await reflect({ ...baseInput, telemetry });
		await reflect(baseInput);
		await reflect({ ...baseInput, telemetry: { ...telemetry, enabled: false } });

		expect(mockGenerateText.mock.calls[0][0]).toMatchObject({
			telemetry: {
				isEnabled: true,
				functionId: 'my-agent.memory-reflector',
				recordInputs: true,
				recordOutputs: false,
			},
		});
		expect(mockGenerateText.mock.calls[1][0].telemetry).toBeUndefined();
		expect(mockGenerateText.mock.calls[2][0].telemetry).toBeUndefined();
	});

	it('reports usage with task="reflector" and the configured model through onUsage', async () => {
		mockGenerateText.mockResolvedValue({
			text: '{"drop":[],"merge":[]}',
			usage: { inputTokens: 50, outputTokens: 5, totalTokens: 55 },
		});
		const onUsage = vi.fn();

		await createObservationLogReflectFn('anthropic/claude-haiku-4-5-20251001', { onUsage })({
			observationScopeId: 'thread-1',
			now: new Date('2026-05-12T14:30:00.000Z'),
			activeObservationLog: [],
			renderedObservationLog: '',
			tokenCount: 10,
			tokenBudget: 12_000,
		});

		expect(onUsage).toHaveBeenCalledWith(
			expect.objectContaining({
				task: 'reflector',
				model: 'anthropic/claude-haiku-4-5-20251001',
				reportId: expect.any(String),
			}),
		);
	});
});

describe('parseObservationLogReflectionJson', () => {
	it('parses reflector JSON with marker labels into storage markers', () => {
		const reflection = parseObservationLogReflectionJson(
			[
				'```json',
				'{',
				'  "drop": ["obs-1"],',
				'  "merge": [',
				'    { "supersedes": ["obs-2", "obs-3"], "marker": "IMPORTANT", "text": "Merged plan detail" }',
				'  ]',
				'}',
				'```',
			].join('\n'),
		);

		expect(reflection).toEqual({
			drop: ['obs-1'],
			merge: [
				{
					supersedes: ['obs-2', 'obs-3'],
					marker: 'important',
					text: 'Merged plan detail',
				},
			],
		});
	});
});

describe('renderObservationLogForReflection', () => {
	it('renders active observations with IDs for reflector input', () => {
		const rendered = renderObservationLogForReflection([
			{
				id: 'parent',
				observationScopeId: 'thread-1',
				marker: 'critical',
				text: 'User chose the observation-log model.',
				parentId: null,
				tokenCount: 10,
				status: 'active',
				supersededBy: null,
				createdAt: new Date('2026-05-12T14:30:00.000Z'),
			},
			{
				id: 'child',
				observationScopeId: 'thread-1',
				marker: 'completion',
				text: 'Plan 7 finished.',
				parentId: 'parent',
				tokenCount: 4,
				status: 'active',
				supersededBy: null,
				createdAt: new Date('2026-05-12T14:31:00.000Z'),
			},
		]);

		expect(rendered).toContain('* [parent] CRITICAL 2026-05-12T14:30:00.000Z User chose');
		expect(rendered).toContain('  * [child] COMPLETION 2026-05-12T14:31:00.000Z Plan 7');
	});

	it('renders active orphan children as top-level observations', () => {
		const rendered = renderObservationLogForReflection([
			{
				id: 'orphan',
				observationScopeId: 'thread-1',
				marker: 'important',
				text: 'Orphaned active observation remains relevant.',
				parentId: 'missing-parent',
				tokenCount: 4,
				status: 'active',
				supersededBy: null,
				createdAt: new Date('2026-05-12T14:32:00.000Z'),
			},
		]);

		expect(rendered).toContain('* [orphan] IMPORTANT 2026-05-12T14:32:00.000Z Orphaned active');
	});
});

describe('normalizeObservationLogReflection', () => {
	it('ignores child-only removal while the parent remains active', () => {
		const parent = observation({ id: 'parent' });
		const child = observation({ id: 'child', parentId: parent.id, marker: 'completion' });

		expect(
			normalizeObservationLogReflection([parent, child], {
				drop: [child.id],
				merge: [
					{
						supersedes: [child.id],
						marker: 'important',
						text: 'Child-only replacement',
					},
				],
			}),
		).toEqual({ drop: [], merge: [] });
	});

	it('expands parent drops to active descendants and lets merge win conflicting drops', () => {
		const parent = observation({ id: 'parent' });
		const child = observation({ id: 'child', parentId: parent.id, marker: 'completion' });
		const merged = observation({ id: 'merged' });

		expect(
			normalizeObservationLogReflection([parent, child, merged], {
				drop: [parent.id, merged.id],
				merge: [
					{
						supersedes: [merged.id],
						marker: 'important',
						text: 'Merged replacement',
					},
				],
			}),
		).toEqual({
			drop: [parent.id, child.id],
			merge: [
				{
					supersedes: [merged.id],
					marker: 'important',
					text: 'Merged replacement',
				},
			],
		});
	});

	it('expands parent merges to active descendants and clears inactive replacement parents', () => {
		const parent = observation({ id: 'parent' });
		const child = observation({ id: 'child', parentId: parent.id, marker: 'completion' });

		expect(
			normalizeObservationLogReflection([parent, child], {
				drop: [],
				merge: [
					{
						supersedes: [parent.id],
						marker: 'important',
						text: 'Merged parent and child',
						parentId: parent.id,
					},
				],
			}),
		).toEqual({
			drop: [],
			merge: [
				{
					supersedes: [parent.id, child.id],
					marker: 'important',
					text: 'Merged parent and child',
					parentId: null,
				},
			],
		});
	});
});

describe('runObservationLogReflector', () => {
	it('waits until the active observation log exceeds the reflector threshold', async () => {
		const store = new InMemoryMemory();
		await store.appendObservationLogEntries([
			{
				observationScopeId: 'thread-1',
				marker: 'info',
				text: 'Small detail',
				tokenCount: 2,
			},
		]);
		const reflect = vi.fn().mockResolvedValue('{"drop":[],"merge":[]}');

		const result = await runObservationLogReflector({
			memory: store,
			observationScopeId: 'thread-1',
			reflectorThresholdTokens: 10,
			reflect,
		});

		expect(result).toEqual({ status: 'skipped', reason: 'below-threshold', tokenCount: 2 });
		expect(reflect).not.toHaveBeenCalled();
	});

	it('applies reflector drop and merge instructions transactionally', async () => {
		const store = new InMemoryMemory();
		const [stale, oldA, oldB] = await store.appendObservationLogEntries([
			{
				observationScopeId: 'thread-1',
				marker: 'info',
				text: 'Tiny aside',
				tokenCount: 9,
			},
			{
				observationScopeId: 'thread-1',
				marker: 'important',
				text: 'Old plan A',
				tokenCount: 9,
			},
			{
				observationScopeId: 'thread-1',
				marker: 'important',
				text: 'Old plan B',
				tokenCount: 9,
			},
		]);

		const result = await runObservationLogReflector({
			memory: store,
			observationScopeId: 'thread-1',
			reflectorThresholdTokens: 10,
			now: new Date('2026-05-12T15:00:00.000Z'),
			tokenCounter: async (text) => {
				expect(text).toBe('User compared old plan A and old plan B.');
				return await Promise.resolve(6);
			},
			reflect: async (input) => {
				expect(input.renderedObservationLog).toContain(`[${stale.id}] INFO`);
				return await Promise.resolve(
					JSON.stringify({
						drop: [stale.id],
						merge: [
							{
								supersedes: [oldA.id, oldB.id],
								marker: 'IMPORTANT',
								text: 'User compared old plan A and old plan B.',
							},
						],
					}),
				);
			},
		});

		expect(result).toMatchObject({
			status: 'ran',
			tokenCount: 27,
			reflection: {
				drop: [stale.id],
				merge: [
					expect.objectContaining({
						supersedes: [oldA.id, oldB.id],
						marker: 'important',
						text: 'User compared old plan A and old plan B.',
						createdAt: new Date('2026-05-12T15:00:00.000Z'),
						tokenCount: 6,
					}),
				],
			},
			overBudgetAfterReflection: false,
		});
		await expect(
			store.getObservationLog({ observationScopeId: 'thread-1', status: 'dropped' }),
		).resolves.toMatchObject([{ id: stale.id, status: 'dropped' }]);
		await expect(
			store.getObservationLog({ observationScopeId: 'thread-1', status: 'superseded' }),
		).resolves.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: oldA.id, status: 'superseded' }),
				expect.objectContaining({ id: oldB.id, status: 'superseded' }),
			]),
		);
		await expect(
			store.getObservationLog({ observationScopeId: 'thread-1', status: 'active' }),
		).resolves.toMatchObject([{ tokenCount: 6 }]);
	});

	it('never fails reflection when onUsage throws synchronously or rejects', async () => {
		// Pricing is best-effort: a misbehaving onUsage callback must not abort
		// the reflector or surface an unhandled rejection. Reflection still
		// applies its drop instruction.
		const syncThrow = vi.fn(() => {
			throw new Error('pricing sync boom');
		});
		const rejecting = vi.fn(async () => {
			throw new Error('pricing async boom');
		});

		for (const onUsage of [syncThrow, rejecting]) {
			const store = new InMemoryMemory();
			const [stale] = await store.appendObservationLogEntries([
				{
					observationScopeId: 'thread-1',
					marker: 'info',
					text: 'Tiny aside',
					tokenCount: 12,
				},
			]);
			const result = await runObservationLogReflector({
				memory: store,
				observationScopeId: 'thread-1',
				reflectorThresholdTokens: 10,
				reflect: async () => await Promise.resolve(JSON.stringify({ drop: [stale.id], merge: [] })),
				onUsage,
			});
			expect(result).toMatchObject({ status: 'ran' });
			expect(onUsage).toHaveBeenCalledTimes(1);
		}
	});

	it('warns but still applies reflection output that remains over budget', async () => {
		const store = new InMemoryMemory();
		const [critical, stale] = await store.appendObservationLogEntries([
			{
				observationScopeId: 'thread-1',
				marker: 'critical',
				text: 'Large critical fact',
				tokenCount: 20,
			},
			{
				observationScopeId: 'thread-1',
				marker: 'info',
				text: 'Small aside',
				tokenCount: 20,
			},
		]);
		const warnings: string[] = [];

		const result = await runObservationLogReflector({
			memory: store,
			observationScopeId: 'thread-1',
			reflectorThresholdTokens: 10,
			reflect: async () => await Promise.resolve(JSON.stringify({ drop: [stale.id], merge: [] })),
			onWarning: (warning) => warnings.push(warning.message),
		});

		expect(result).toMatchObject({
			status: 'ran',
			remainingTokenCount: 20,
			overBudgetAfterReflection: true,
		});
		expect(warnings).toEqual(['Observation log remains over reflector budget after reflection']);
		await expect(
			store.getActiveObservationLog({ observationScopeId: 'thread-1' }),
		).resolves.toMatchObject([{ id: critical.id }]);
	});

	it('does not persist secret values echoed by the reflector into merged observations', async () => {
		const store = new InMemoryMemory();
		const [oldA, oldB] = await store.appendObservationLogEntries([
			{
				observationScopeId: 'thread-1',
				marker: 'important',
				text: 'Old plan A',
				tokenCount: 9,
			},
			{
				observationScopeId: 'thread-1',
				marker: 'important',
				text: 'Old plan B',
				tokenCount: 9,
			},
		]);

		const result = await runObservationLogReflector({
			memory: store,
			observationScopeId: 'thread-1',
			reflectorThresholdTokens: 10,
			reflect: async () =>
				await Promise.resolve(
					JSON.stringify({
						drop: [],
						merge: [
							{
								supersedes: [oldA.id, oldB.id],
								marker: 'IMPORTANT',
								text: 'User set the Slack bot token to xoxb-1234567890-abcdefghij.',
							},
						],
					}),
				),
		});

		expect(result).toMatchObject({ status: 'ran' });
		if (result.status !== 'ran') throw new Error('expected reflector to run');
		expect(result.reflection.merge[0].text).toContain('[REDACTED]');
		expect(result.reflection.merge[0].text).not.toContain('xoxb-1234567890-abcdefghij');

		const merged = await store.getObservationLog({
			observationScopeId: 'thread-1',
			status: 'active',
		});
		expect(merged.some((entry) => entry.text.includes('xoxb-1234567890-abcdefghij'))).toBe(false);
		expect(merged.some((entry) => entry.text.includes('[REDACTED]'))).toBe(true);
	});
});
