import type { AgentMessage, ContextNoteRequest } from '@n8n/agents';
import type { EmbeddingModel } from 'ai';
import { MockEmbeddingModelV3 } from 'ai/test';

import {
	buildStepQuery,
	createGotchaNotesProvider,
	gotchaNoteId,
	type GotchaRetrievalTrace,
} from '../gotcha-notes';
import { WORKFLOW_BUILDER_GOTCHAS } from '../gotchas/workflow-builder.gotchas';
import { isGotchaAblated, parseAblatedGotchas, type SkillGotchaSet } from '../skill-gotchas';
import { loadInstanceAiSkills } from '../skills';

describe('workflow-builder gotcha ledger', () => {
	it('has unique ids and a trigger sentence for each gotcha', () => {
		const ids = WORKFLOW_BUILDER_GOTCHAS.gotchas.map((g) => g.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const gotcha of WORKFLOW_BUILDER_GOTCHAS.gotchas) {
			expect(gotcha.text.trim()).not.toBe('');
			expect(gotcha.appliesWhen.trim()).not.toBe('');
		}
	});

	it('keeps gotchas out of the skill body', async () => {
		const skill = await loadInstanceAiSkills().loadSkill('workflow-builder');
		expect(skill?.instructions).not.toContain('gotcha:');
		expect(skill?.instructions).not.toContain(WORKFLOW_BUILDER_GOTCHAS.gotchas[0].text);
	});

	it('parses ablation ids', () => {
		expect(isGotchaAblated('one', parseAblatedGotchas('one, two'))).toBe(true);
		expect(isGotchaAblated('three', parseAblatedGotchas('one'))).toBe(false);
		expect(isGotchaAblated('three', parseAblatedGotchas('*'))).toBe(true);
	});
});

describe('buildStepQuery', () => {
	it('uses the latest user text as intent and later activity as the step', () => {
		const messages: AgentMessage[] = [
			{ role: 'user', content: [{ type: 'text', text: 'old request' }] },
			{ role: 'assistant', content: [{ type: 'text', text: 'old answer' }] },
			{
				role: 'user',
				content: [
					{ type: 'text', text: '<system-reminder>ignore</system-reminder>' },
					{ type: 'text', text: 'Send a Slack message for each new row' },
				],
			},
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Building it.' },
					{
						type: 'tool-call',
						toolCallId: 'c1',
						toolName: 'workflow_builder_build_workflow',
						input: { filePath: 'a.ts' },
						state: 'rejected',
						error: 'Mock output missing field',
					},
				],
			},
		];
		const query = buildStepQuery(messages);
		expect(query.intent).toBe('Send a Slack message for each new row');
		expect(query.step).toContain('Building it.');
		expect(query.step).toContain('workflow_builder_build_workflow({"filePath":"a.ts"})');
		expect(query.step).toContain('Error: Mock output missing field');
		expect(query.step).not.toContain('old answer');
	});
});

describe('createGotchaNotesProvider', () => {
	const sets: SkillGotchaSet[] = [
		{
			skillId: 'workflow-builder',
			gotchas: [
				{ id: 'a', text: 'Rule A', appliesWhen: 'alpha', fixes: '', origin: '', evalCases: [] },
				{ id: 'b', text: 'Rule B', appliesWhen: 'beta', fixes: '', origin: '', evalCases: [] },
			],
		},
	];
	const vectors: Record<string, number[]> = {
		alpha: [1, 0],
		beta: [0, 1],
		'about alpha': [0.9, 0.1],
	};
	const model = new MockEmbeddingModelV3({
		doEmbed: async ({ values }) => ({
			embeddings: values.map((value) => vectors[value] ?? [0.5, 0.5]),
			warnings: [],
		}),
	}) as unknown as EmbeddingModel;

	const request = (overrides: Partial<ContextNoteRequest> = {}): ContextNoteRequest => ({
		messages: [{ role: 'user', content: [{ type: 'text', text: 'about alpha' }] }],
		activeSkillIds: ['workflow-builder'],
		sentNoteIds: new Set(),
		...overrides,
	});

	it('returns gotchas above the threshold', async () => {
		const provider = createGotchaNotesProvider({ sets, embeddingModel: model, threshold: 0.8 });
		expect(await provider(request())).toEqual([
			{ id: gotchaNoteId('workflow-builder', 'a'), content: 'Rule A' },
		]);
	});

	it('returns nothing when the skill is not active', async () => {
		const provider = createGotchaNotesProvider({ sets, embeddingModel: model });
		expect(await provider(request({ activeSkillIds: [] }))).toEqual([]);
	});

	it('skips sent and ablated gotchas', async () => {
		const provider = createGotchaNotesProvider({
			sets,
			embeddingModel: model,
			threshold: 0,
			ablated: new Set(['b']),
		});
		const sent = new Set([gotchaNoteId('workflow-builder', 'a')]);
		expect(await provider(request({ sentNoteIds: sent }))).toEqual([]);
	});

	it('falls back to BM25 without an embedding model', async () => {
		const traces: GotchaRetrievalTrace[] = [];
		const provider = createGotchaNotesProvider({
			sets: [WORKFLOW_BUILDER_GOTCHAS],
			onRetrieval: (trace) => traces.push(trace),
		});
		const notes = await provider(
			request({
				messages: [
					{ role: 'user', content: [{ type: 'text', text: 'Route urgent tickets to Slack' }] },
					{
						role: 'assistant',
						content: [
							{
								type: 'text',
								text: 'Adding an IF node, then ifNode.onTrue(slack) after export default.',
							},
						],
					},
				],
			}),
		);
		expect(traces[0].method).toBe('bm25');
		expect(notes.map((note) => note.id)).toContain(
			gotchaNoteId('workflow-builder', 'if-branches-on-builder'),
		);
	});

	it('BM25 fires nothing for an unrelated step', async () => {
		const provider = createGotchaNotesProvider({ sets: [WORKFLOW_BUILDER_GOTCHAS] });
		const notes = await provider(
			request({
				messages: [
					{ role: 'user', content: [{ type: 'text', text: 'Hello, how are you today?' }] },
				],
			}),
		);
		expect(notes).toEqual([]);
	});

	it('reports matches and near misses', async () => {
		const traces: unknown[] = [];
		const provider = createGotchaNotesProvider({
			sets,
			embeddingModel: model,
			threshold: 0.8,
			onRetrieval: (trace) => traces.push(trace),
		});
		await provider(request());
		expect(traces).toEqual([
			expect.objectContaining({
				matches: [expect.objectContaining({ gotchaId: 'a' })],
				nearMisses: [expect.objectContaining({ gotchaId: 'b' })],
			}),
		]);
	});
});
