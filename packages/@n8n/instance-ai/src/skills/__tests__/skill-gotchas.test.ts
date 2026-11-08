import type { AgentMessage, ContextNoteRequest } from '@n8n/agents';
import type { EmbeddingModel } from 'ai';
import { MockEmbeddingModelV3 } from 'ai/test';

import {
	buildStepQuery,
	createGotchaNotesProvider,
	detectGotchaPhases,
	gotchaNoteId,
	type GotchaRetrievalTrace,
} from '../gotcha-notes';
import { INTENT_RECOGNITION_GOTCHAS } from '../gotchas/intent-recognition.gotchas';
import { POST_BUILD_FLOW_GOTCHAS } from '../gotchas/post-build-flow.gotchas';
import { WORKFLOW_BUILDER_GOTCHAS } from '../gotchas/workflow-builder.gotchas';
import { isGotchaAblated, parseAblatedGotchas, type SkillGotchaSet } from '../skill-gotchas';
import { loadInstanceAiSkills } from '../skills';

describe.each([WORKFLOW_BUILDER_GOTCHAS, INTENT_RECOGNITION_GOTCHAS, POST_BUILD_FLOW_GOTCHAS])(
	'$skillId gotcha ledger',
	(set) => {
		it('has unique ids and a trigger sentence for each gotcha', () => {
			const ids = set.gotchas.map((g) => g.id);
			expect(new Set(ids).size).toBe(ids.length);
			for (const gotcha of set.gotchas) {
				expect(gotcha.text.trim()).not.toBe('');
				expect(gotcha.appliesWhen.trim()).not.toBe('');
			}
		});

		it('keeps gotchas out of the skill body', async () => {
			const skill = await loadInstanceAiSkills().loadSkill(set.skillId);
			expect(skill).toBeDefined();
			expect(skill?.instructions).not.toContain('gotcha:');
			for (const gotcha of set.gotchas) {
				expect(skill?.instructions).not.toContain(gotcha.text);
			}
		});
	},
);

describe('gotcha ablation', () => {
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
		expect(query.step).toContain('Called workflow_builder_build_workflow with filePath');
		expect(query.step).toContain('Error: Mock output missing field');
		expect(query.step).not.toContain('old answer');
	});

	it('takes the request that follows a thread-context block in the same text part', () => {
		const context = `<thread-context>\n${'Recent change: fix it, carry on. '.repeat(200)}\n</thread-context>`;
		const query = buildStepQuery([
			{
				role: 'user',
				content: [{ type: 'text', text: `${context}\n\nReply to WhatsApp messages with Gemini` }],
			},
		]);
		expect(query.intent).toBe('Reply to WhatsApp messages with Gemini');
	});

	it('keeps code, markup and tool results out of the query', () => {
		const query = buildStepQuery([
			{ role: 'user', content: [{ type: 'text', text: 'Build it' }] },
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'c1',
						toolName: 'find_tools',
						input: { tools: ['search_nodes'] },
						state: 'resolved',
						output: { tools: [{ name: 'search_nodes', inputSchema: 'SCHEMA' }] },
					},
					{
						type: 'tool-call',
						toolCallId: 'c2',
						toolName: 'call_tool',
						input: { tool: 'search_nodes' },
						state: 'resolved',
						output: 'NODE RESULT',
					},
				],
			},
		]);
		expect(query.step).toContain('Called find_tools with tools');
		expect(query.step).toContain('Called search_nodes');
		expect(query.step).not.toContain('SCHEMA');
		expect(query.step).not.toContain('NODE RESULT');

		const withCode = buildStepQuery([
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: 'Insert rows <script>x</script> using {{ $json.id }}\n```sql\nSELECT 1;\n```',
					},
				],
			},
		]);
		expect(withCode.intent).toBe('Insert rows x using');
	});
});

describe('detectGotchaPhases', () => {
	const call = (tool: string, state: 'resolved' | 'rejected'): AgentMessage => ({
		role: 'assistant',
		content: [
			state === 'resolved'
				? {
						type: 'tool-call',
						toolCallId: tool,
						toolName: 'call_tool',
						input: { tool },
						state,
						output: {},
					}
				: {
						type: 'tool-call',
						toolCallId: tool,
						toolName: tool,
						input: {},
						state,
						error: 'failed',
					},
		],
	});

	it('starts with no phase', () => {
		expect(detectGotchaPhases([call('get_workflow_as_code', 'rejected')])).toEqual(new Set());
	});

	it('reads phases from successful calls through call_tool', () => {
		expect(detectGotchaPhases([call('get_workflow_as_code', 'resolved')])).toEqual(
			new Set(['editing']),
		);
		expect(detectGotchaPhases([call('workflow_builder_build_workflow', 'resolved')])).toEqual(
			new Set(['after-build']),
		);
	});

	it('counts a build from an earlier turn as editing', () => {
		const user: AgentMessage = { role: 'user', content: [{ type: 'text', text: 'change it' }] };
		expect(detectGotchaPhases([call('workflow_builder_build_workflow', 'resolved'), user])).toEqual(
			new Set(['after-build', 'editing']),
		);
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

	it('holds a gated gotcha back until the thread mentions one of its strings', async () => {
		const gated: SkillGotchaSet[] = [
			{
				skillId: 'workflow-builder',
				gotchas: [
					{
						id: 'a',
						requiresAny: ['n8n-nodes-base.gmailTrigger'],
						text: 'Rule A',
						appliesWhen: 'alpha',
						fixes: '',
						origin: '',
						evalCases: [],
					},
				],
			},
		];
		const provider = createGotchaNotesProvider({
			sets: gated,
			embeddingModel: model,
			threshold: 0.8,
		});
		expect(await provider(request())).toEqual([]);
		const fromContext = await provider(
			request({
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: '<thread-context>[id:1] workflow · +2 n8n-nodes-base.gmailTrigger</thread-context>\nabout alpha',
							},
						],
					},
				],
			}),
		);
		expect(fromContext).toEqual([]);
		const withNode = await provider(
			request({
				messages: [
					{ role: 'user', content: [{ type: 'text', text: 'about alpha' }] },
					{
						role: 'assistant',
						content: [
							{
								type: 'tool-call',
								toolCallId: 'c1',
								toolName: 'call_tool',
								input: {
									tool: 'get_node_types',
									arguments: { nodeTypes: ['n8n-nodes-base.gmailTrigger'] },
								},
								state: 'resolved',
								output: {},
							},
						],
					},
				],
			}),
		);
		expect(withNode.map((note) => note.id)).toEqual([gotchaNoteId('workflow-builder', 'a')]);
	});

	it('returns gotchas above the threshold', async () => {
		const provider = createGotchaNotesProvider({ sets, embeddingModel: model, threshold: 0.8 });
		expect(await provider(request())).toEqual([
			{ id: gotchaNoteId('workflow-builder', 'a'), content: 'Rule A' },
		]);
	});

	it('switches to BM25 once when embedding fails', async () => {
		const doEmbed = vi.fn(async () => {
			throw new Error('Forbidden');
		});
		const failing = new MockEmbeddingModelV3({ doEmbed }) as unknown as EmbeddingModel;
		const onEmbeddingFailure = vi.fn();
		const methods: string[] = [];
		const provider = createGotchaNotesProvider({
			sets,
			embeddingModel: failing,
			onEmbeddingFailure,
			onRetrieval: (trace) => methods.push(trace.method),
		});
		await expect(provider(request())).resolves.toBeInstanceOf(Array);
		await provider(
			request({ messages: [{ role: 'user', content: [{ type: 'text', text: 'beta now' }] }] }),
		);
		expect(onEmbeddingFailure).toHaveBeenCalledTimes(1);
		expect(methods).toEqual(['bm25', 'bm25']);
		expect(doEmbed.mock.calls.length).toBeLessThanOrEqual(2);
	});

	describe('on-load delivery', () => {
		const onLoadSets: SkillGotchaSet[] = [
			{ ...sets[0], skillId: 'intent-recognition', delivery: 'on-load' },
		];
		const user: AgentMessage = { role: 'user', content: [{ type: 'text', text: 'about alpha' }] };
		const loadCall = (skillId: string): AgentMessage => ({
			role: 'assistant',
			content: [
				{
					type: 'tool-call',
					toolCallId: 'load',
					toolName: 'load_skill',
					input: { skillId },
					state: 'resolved',
					output: {},
				},
			],
		});
		const laterStep: AgentMessage = {
			role: 'assistant',
			content: [{ type: 'text', text: 'Building it now.' }],
		};
		const onLoadRequest = (messages: AgentMessage[]) =>
			request({ messages, activeSkillIds: ['intent-recognition'] });

		it('fires in the call right after the skill loads', async () => {
			const provider = createGotchaNotesProvider({
				sets: onLoadSets,
				embeddingModel: model,
				threshold: 0.8,
			});
			expect(await provider(onLoadRequest([user, loadCall('intent-recognition')]))).toEqual([
				{ id: gotchaNoteId('intent-recognition', 'a'), content: 'Rule A' },
			]);
		});

		it('stays silent on later steps and when another skill loads', async () => {
			const provider = createGotchaNotesProvider({
				sets: onLoadSets,
				embeddingModel: model,
				threshold: 0,
			});
			expect(
				await provider(onLoadRequest([user, loadCall('intent-recognition'), laterStep])),
			).toEqual([]);
			expect(await provider(onLoadRequest([user, loadCall('workflow-builder')]))).toEqual([]);
			expect(await provider(onLoadRequest([user]))).toEqual([]);
		});

		it('leaves every-step sets firing on later steps', async () => {
			const provider = createGotchaNotesProvider({ sets, embeddingModel: model, threshold: 0.8 });
			expect(await provider(request({ messages: [user, laterStep] }))).toHaveLength(1);
		});
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

	// The build tool activates post-build-flow without a load_skill call.
	it('fires post-build gotchas on later steps once the build activates the skill', async () => {
		const provider = createGotchaNotesProvider({ sets: [POST_BUILD_FLOW_GOTCHAS] });
		const notes = await provider(
			request({
				activeSkillIds: ['post-build-flow'],
				messages: [
					{ role: 'user', content: [{ type: 'text', text: 'Build me a lead intake form' }] },
					{
						role: 'assistant',
						content: [
							{
								type: 'text',
								text: 'Verification used mocked credentials and simulated output. Setup finished, so I will suggest publishing next.',
							},
						],
					},
				],
			}),
		);
		expect(notes.map((note) => note.id)).toContain(
			gotchaNoteId('post-build-flow', 'no-publish-before-live-test'),
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

	it('holds a phase gotcha back until its phase starts, then sends it', async () => {
		const phased: SkillGotchaSet[] = [
			{
				skillId: 'workflow-builder',
				gotchas: [
					{
						id: 'a',
						phase: 'after-build',
						text: 'Rule A',
						appliesWhen: 'alpha',
						fixes: '',
						origin: '',
						evalCases: [],
					},
				],
			},
		];
		const provider = createGotchaNotesProvider({
			sets: phased,
			embeddingModel: model,
			threshold: 0.8,
		});
		expect(await provider(request())).toEqual([]);
		const built = await provider(
			request({
				messages: [
					{ role: 'user', content: [{ type: 'text', text: 'about alpha' }] },
					{
						role: 'assistant',
						content: [
							{
								type: 'tool-call',
								toolCallId: 'c1',
								toolName: 'call_tool',
								input: { tool: 'workflow_builder_build_workflow' },
								state: 'resolved',
								output: {},
							},
						],
					},
				],
			}),
		);
		expect(built.map((note) => note.id)).toEqual([gotchaNoteId('workflow-builder', 'a')]);
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
