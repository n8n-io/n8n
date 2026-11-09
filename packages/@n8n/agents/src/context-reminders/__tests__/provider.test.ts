import type { EmbeddingModel } from 'ai';
import { MockEmbeddingModelV3 } from 'ai/test';

import type { ContextNoteRequest } from '../../types/runtime/agent-runtime';
import type { AgentMessage } from '../../types/sdk/message';
import {
	buildContextReminderQuery,
	contextReminderNoteId,
	createContextReminderProvider,
	parseAblatedContextReminders,
} from '../provider';
import type { ContextReminderRetrievalTrace, ContextReminderSet } from '../types';

const user = (text: string): AgentMessage => ({ role: 'user', content: [{ type: 'text', text }] });

const toolCall = (toolName: string, input: unknown): AgentMessage => ({
	role: 'assistant',
	content: [
		{ type: 'tool-call', toolCallId: toolName, toolName, input, state: 'resolved', output: {} },
	],
});

describe('parseAblatedContextReminders', () => {
	it('parses a comma-separated id list', () => {
		expect(parseAblatedContextReminders(' one, two ,,')).toEqual(new Set(['one', 'two']));
		expect(parseAblatedContextReminders(undefined)).toEqual(new Set());
	});
});

describe('buildContextReminderQuery', () => {
	it('uses the latest user text as intent and later activity as the step', () => {
		const messages: AgentMessage[] = [
			user('old request'),
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
						toolName: 'build',
						input: { filePath: 'a.ts' },
						state: 'rejected',
						error: 'Mock output missing field',
					},
				],
			},
		];
		const query = buildContextReminderQuery(messages);
		expect(query.intent).toBe('Send a Slack message for each new row');
		expect(query.step).toContain('Building it.');
		expect(query.step).toContain('Called build with filePath');
		expect(query.step).toContain('Error: Mock output missing field');
		expect(query.step).not.toContain('old answer');
	});

	it('strips host tags passed as injectedTags', () => {
		const context = `<host-context>\n${'Earlier change. '.repeat(200)}\n</host-context>`;
		const query = buildContextReminderQuery(
			[user(`${context}\n\nReply to WhatsApp messages`)],
			['host-context'],
		);
		expect(query.intent).toBe('Reply to WhatsApp messages');
	});

	it('keeps code, markup and tool results out of the query', () => {
		const query = buildContextReminderQuery([
			user('Build it'),
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'c1',
						toolName: 'search_nodes',
						input: { query: 'slack' },
						state: 'resolved',
						output: 'NODE RESULT',
					},
				],
			},
		]);
		expect(query.step).toBe('Called search_nodes with query');

		const withCode = buildContextReminderQuery([
			user('Insert rows <script>x</script> using {{ $json.id }}\n```sql\nSELECT 1;\n```'),
		]);
		expect(withCode.intent).toBe('Insert rows x using');
	});
});

describe('createContextReminderProvider', () => {
	const sets: ContextReminderSet[] = [
		{
			skillId: 'builder',
			reminders: [
				{ id: 'a', text: 'Rule A', appliesWhen: 'alpha' },
				{ id: 'b', text: 'Rule B', appliesWhen: 'beta' },
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
		messages: [user('about alpha')],
		activeSkillIds: ['builder'],
		sentNoteIds: new Set(),
		...overrides,
	});

	it('returns reminders above the threshold', async () => {
		const provider = createContextReminderProvider({ sets, embeddingModel: model, threshold: 0.8 });
		expect(await provider(request())).toEqual([
			{ id: contextReminderNoteId('builder', 'a'), content: 'Rule A' },
		]);
	});

	it('returns nothing when the skill is not active', async () => {
		const provider = createContextReminderProvider({ sets, embeddingModel: model });
		expect(await provider(request({ activeSkillIds: [] }))).toEqual([]);
	});

	it('skips sent and ablated reminders', async () => {
		const provider = createContextReminderProvider({
			sets,
			embeddingModel: model,
			threshold: 0,
			ablate: new Set(['b']),
		});
		const sent = new Set([contextReminderNoteId('builder', 'a')]);
		expect(await provider(request({ sentNoteIds: sent }))).toEqual([]);
	});

	it('leaves every reminder out with the * ablation', async () => {
		const provider = createContextReminderProvider({
			sets,
			embeddingModel: model,
			threshold: 0,
			ablate: new Set(['*']),
		});
		expect(await provider(request())).toEqual([]);
	});

	it('holds a gated reminder back until user text or a tool input mentions it', async () => {
		const gated: ContextReminderSet[] = [
			{
				skillId: 'builder',
				reminders: [
					{ id: 'a', requiresAny: ['gmailTrigger'], text: 'Rule A', appliesWhen: 'alpha' },
				],
			},
		];
		const provider = createContextReminderProvider({
			sets: gated,
			embeddingModel: model,
			threshold: 0.8,
			injectedTags: ['host-context'],
		});
		expect(await provider(request())).toEqual([]);
		// Host context can name things from elsewhere, so it does not open the gate.
		expect(
			await provider(
				request({
					messages: [user('<host-context>uses gmailTrigger</host-context>\nabout alpha')],
				}),
			),
		).toEqual([]);
		const withNode = await provider(
			request({
				messages: [user('about alpha'), toolCall('get_node', { nodeType: 'gmailTrigger' })],
			}),
		);
		expect(withNode.map((note) => note.id)).toEqual([contextReminderNoteId('builder', 'a')]);
	});

	it('holds a phase reminder back until detectPhases reports its phase', async () => {
		const phased: ContextReminderSet[] = [
			{
				skillId: 'builder',
				reminders: [{ id: 'a', phase: 'after-build', text: 'Rule A', appliesWhen: 'alpha' }],
			},
		];
		const detectPhases = (messages: readonly AgentMessage[]) =>
			new Set(messages.some((m) => 'role' in m && m.role === 'assistant') ? ['after-build'] : []);
		const provider = createContextReminderProvider({
			sets: phased,
			embeddingModel: model,
			threshold: 0.8,
			detectPhases,
		});
		expect(await provider(request())).toEqual([]);
		const built = await provider(
			request({ messages: [user('about alpha'), toolCall('build', {})] }),
		);
		expect(built.map((note) => note.id)).toEqual([contextReminderNoteId('builder', 'a')]);
	});

	it('never sends a phase reminder without detectPhases', async () => {
		const phased: ContextReminderSet[] = [
			{
				skillId: 'builder',
				reminders: [{ id: 'a', phase: 'after-build', text: 'Rule A', appliesWhen: 'alpha' }],
			},
		];
		const provider = createContextReminderProvider({
			sets: phased,
			embeddingModel: model,
			threshold: 0,
		});
		expect(
			await provider(request({ messages: [user('about alpha'), toolCall('build', {})] })),
		).toEqual([]);
	});

	it('switches to BM25 once when embedding fails', async () => {
		const doEmbed = vi.fn(async () => {
			throw new Error('Forbidden');
		});
		const failing = new MockEmbeddingModelV3({ doEmbed }) as unknown as EmbeddingModel;
		const onEmbeddingFailure = vi.fn();
		const methods: string[] = [];
		const provider = createContextReminderProvider({
			sets,
			embeddingModel: failing,
			onEmbeddingFailure,
			onRetrieval: (trace) => methods.push(trace.method),
		});
		await expect(provider(request())).resolves.toBeInstanceOf(Array);
		await provider(request({ messages: [user('beta now')] }));
		expect(onEmbeddingFailure).toHaveBeenCalledTimes(1);
		expect(methods).toEqual(['bm25', 'bm25']);
		expect(doEmbed.mock.calls.length).toBeLessThanOrEqual(2);
	});

	it('ranks with BM25 without an embedding model', async () => {
		const traces: ContextReminderRetrievalTrace[] = [];
		const provider = createContextReminderProvider({
			sets: [
				{
					skillId: 'builder',
					reminders: [
						{
							id: 'if-branches',
							text: 'Wire IF branches inside the builder chain.',
							appliesWhen: 'Connecting true and false branches of an IF node.',
						},
						{
							id: 'dates',
							text: 'Format dates with Luxon.',
							appliesWhen: 'Formatting a date or a timestamp.',
						},
					],
				},
			],
			onRetrieval: (trace) => traces.push(trace),
		});
		const notes = await provider(
			request({ messages: [user('Route urgent tickets: connect the IF true branches to Slack')] }),
		);
		expect(traces[0].method).toBe('bm25');
		expect(notes.map((note) => note.id)).toEqual([contextReminderNoteId('builder', 'if-branches')]);
		expect(await provider(request({ messages: [user('Hello, how are you today?')] }))).toEqual([]);
	});

	it('reports matches and near misses', async () => {
		const traces: ContextReminderRetrievalTrace[] = [];
		const provider = createContextReminderProvider({
			sets,
			embeddingModel: model,
			threshold: 0.8,
			onRetrieval: (trace) => traces.push(trace),
		});
		await provider(request());
		expect(traces).toEqual([
			expect.objectContaining({
				matches: [expect.objectContaining({ reminderId: 'a' })],
				nearMisses: [expect.objectContaining({ reminderId: 'b' })],
			}),
		]);
	});

	describe('on-load delivery', () => {
		const onLoadSets: ContextReminderSet[] = [
			{ ...sets[0], skillId: 'router', delivery: 'on-load' },
		];
		const loadCall = (input: Record<string, string>) => toolCall('load_skill', input);
		const laterStep: AgentMessage = {
			role: 'assistant',
			content: [{ type: 'text', text: 'Building it now.' }],
		};
		const onLoadRequest = (messages: AgentMessage[]) =>
			request({ messages, activeSkillIds: ['router'] });

		it('fires in the call right after the skill loads, by id or by name', async () => {
			const provider = createContextReminderProvider({
				sets: onLoadSets,
				embeddingModel: model,
				threshold: 0.8,
			});
			const expected = [{ id: contextReminderNoteId('router', 'a'), content: 'Rule A' }];
			expect(
				await provider(onLoadRequest([user('about alpha'), loadCall({ skillId: 'router' })])),
			).toEqual(expected);
			expect(
				await provider(onLoadRequest([user('about alpha'), loadCall({ name: 'router' })])),
			).toEqual(expected);
		});

		it('stays silent on later steps and when another skill loads', async () => {
			const provider = createContextReminderProvider({
				sets: onLoadSets,
				embeddingModel: model,
				threshold: 0,
			});
			expect(
				await provider(
					onLoadRequest([user('about alpha'), loadCall({ skillId: 'router' }), laterStep]),
				),
			).toEqual([]);
			expect(
				await provider(onLoadRequest([user('about alpha'), loadCall({ skillId: 'other' })])),
			).toEqual([]);
		});
	});
});
