/* eslint-disable import-x/order */
import { vi } from 'vitest';

vi.mock('fs', () => ({
	readdirSync: vi.fn(),
	readFileSync: vi.fn(),
}));

import { readdirSync, readFileSync } from 'fs';

import { loadWorkflowTestCasesWithFiles } from '../data/workflows';
import { EvalTestCaseSchema, conversationTurnTextSchema, type CaseSeed } from '../harness/schema';

const mockedReaddir = vi.mocked(readdirSync);
const mockedReadFile = vi.mocked(readFileSync);

const validFixture = () => ({
	conversation: [{ role: 'user' as const, text: 'Build a thing' }],
	complexity: 'simple' as const,
	tags: ['test'],
	executionScenarios: [
		{
			name: 'happy-path',
			description: 'Normal',
			dataSetup: 'Webhook receives data',
			successCriteria: 'Workflow runs',
		},
	],
});

/** Narrow a parsed case's `seed` to one arm so its fields are readable. Throwing
 *  (rather than casting) keeps a wrong-arm parse a test failure, not a silent
 *  `undefined` compared against `undefined`. */
function inlineSeedOf(parsed: { seed?: CaseSeed }) {
	if (parsed.seed?.mode !== 'inline')
		throw new Error(`expected an inline seed, got ${String(parsed.seed?.mode)}`);
	return parsed.seed;
}

function replaySeedOf(parsed: { seed?: CaseSeed }) {
	if (parsed.seed?.mode !== 'replay')
		throw new Error(`expected a replay seed, got ${String(parsed.seed?.mode)}`);
	return parsed.seed;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockedReaddir.mockReturnValue(['demo.json'] as unknown as ReturnType<typeof readdirSync>);
});

describe('EvalTestCaseSchema', () => {
	it('accepts a minimal valid fixture', () => {
		const parsed = EvalTestCaseSchema.parse(validFixture());
		expect(parsed.executionScenarios).toHaveLength(1);
		expect(parsed.conversation![0].role).toBe('user');
	});

	it('rejects an empty conversation', () => {
		expect(() => EvalTestCaseSchema.parse({ ...validFixture(), conversation: [] })).toThrow();
	});

	it('normalizes an array-form turn text to a newline-joined string', () => {
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			conversation: [{ role: 'user', text: ['line 1', 'line 2'] }],
		});
		expect(parsed.conversation![0].text).toBe('line 1\nline 2');
	});

	it('rejects 0 execution scenarios AND 0 expectations (a case must assert something)', () => {
		expect(() => EvalTestCaseSchema.parse({ ...validFixture(), executionScenarios: [] })).toThrow(
			/at least one executionScenario, or a process\/outcome expectation/,
		);
	});

	it('accepts an empty executionScenarios array when an outcome expectation is present', () => {
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			executionScenarios: [],
			outcomeExpectations: ['The workflow posts a summary to Slack #growth.'],
		});
		expect(parsed.executionScenarios).toEqual([]);
		expect(parsed.outcomeExpectations).toHaveLength(1);
	});

	it('accepts an omitted executionScenarios key when a process expectation is present', () => {
		const { executionScenarios: _omit, ...rest } = validFixture();
		const parsed = EvalTestCaseSchema.parse({
			...rest,
			processExpectations: ['Before building, the agent asked which Slack channel to use.'],
		});
		expect(parsed.executionScenarios).toBeUndefined();
		expect(parsed.processExpectations).toHaveLength(1);
	});

	it('rejects an unknown complexity value', () => {
		expect(() => EvalTestCaseSchema.parse({ ...validFixture(), complexity: 'gigantic' })).toThrow();
	});

	// `.strict()` rejects every key the schema no longer declares, so a disk case
	// carrying a pre-union seed key fails loudly. (A SUITE-sourced case is a
	// different path — the normalizer strips unknown keys, so provider.ts guards
	// the raw body instead; see langtracer-provider.test.ts.)
	it.each(['seedFile', 'conversationSeed', 'priorConversation', 'seedThread'])(
		'rejects a disk case still carrying the legacy %s key',
		(key) => {
			// `.strict()` names the offending key: "Unrecognized key(s) in object: 'seedFile'".
			expect(() => EvalTestCaseSchema.parse({ ...validFixture(), [key]: 'anything' })).toThrow(key);
		},
	);

	it('accepts an inline seed and defaults its optional arrays', () => {
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			seed: {
				mode: 'inline',
				messages: [
					{
						id: 'm1',
						type: 'llm',
						role: 'user',
						createdAt: '2026-06-29T09:00:00.000Z',
						content: [{ type: 'text', text: 'build it' }],
					},
				],
			},
		});
		const seed = inlineSeedOf(parsed);
		expect(seed.messages).toHaveLength(1);
		expect(seed.workflows).toEqual([]);
		expect(seed.dataTables).toEqual([]);
	});

	it('rejects an inline seed with no messages', () => {
		expect(() =>
			EvalTestCaseSchema.parse({ ...validFixture(), seed: { mode: 'inline', messages: [] } }),
		).toThrow();
	});

	it('rejects an unknown seed mode', () => {
		expect(() =>
			EvalTestCaseSchema.parse({ ...validFixture(), seed: { mode: 'prose', messages: [] } }),
		).toThrow(/mode/);
	});

	// A future stamp would sort the seeded turn after the live turn, so the agent
	// sees its own history out of order and the judge grades a transcript that
	// never happened.
	it('pulls a future envelope createdAt back before the live turn', () => {
		const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			seed: {
				mode: 'inline',
				messages: [
					{
						id: 'm1',
						type: 'llm',
						role: 'user',
						createdAt: future,
						content: [{ type: 'text', text: 'build it' }],
					},
				],
			},
		});
		const seed = inlineSeedOf(parsed);
		expect(Date.parse(String(seed.messages[0].createdAt))).toBeLessThan(Date.now());
	});

	// A per-message clamp is not enough: with [future A, past B] only A moves, so
	// the DB orders B then A while `transcriptPrefixFromSeed` still grades array
	// order (A then B). The sequence has to stay coherent as a whole.
	it('restamps the whole sequence in array order when any timestamp is future', () => {
		const msg = (id: string, createdAt: string) => ({
			id,
			type: 'llm',
			role: 'user' as const,
			createdAt,
			content: [{ type: 'text', text: id }],
		});
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			seed: {
				mode: 'inline',
				messages: [
					msg('a', new Date(Date.now() + 60 * 60 * 1000).toISOString()),
					msg('b', '2026-06-29T09:00:00.000Z'),
				],
			},
		});

		const at = inlineSeedOf(parsed).messages.map((m) => Date.parse(String(m.createdAt)));
		// Ascending in ARRAY order, and entirely before the live turn.
		expect(at[0]).toBeLessThan(at[1]);
		expect(at[1]).toBeLessThan(Date.now());
	});

	it('leaves an authored past createdAt exactly as written', () => {
		const authored = '2026-06-29T09:00:00.000Z';
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			seed: {
				mode: 'inline',
				messages: [
					{
						id: 'm1',
						type: 'llm',
						role: 'user',
						createdAt: authored,
						content: [{ type: 'text', text: 'build it' }],
					},
				],
			},
		});
		expect(inlineSeedOf(parsed).messages[0].createdAt).toBe(authored);
	});

	// The restamp lands on fixed slots, never `Date.now()`-derived: `createdAt` is
	// part of the projection `planPush` compares, so a now-based rewrite would read
	// as an edit on every parse and re-PATCH the case forever.
	it('restamps a future createdAt to the same value on every parse', () => {
		const caseJson = {
			...validFixture(),
			seed: {
				mode: 'inline',
				messages: [
					{
						id: 'm1',
						type: 'llm',
						role: 'user',
						createdAt: '2099-01-01T00:00:00.000Z',
						content: [{ type: 'text', text: 'build it' }],
					},
				],
			},
		};
		const first = inlineSeedOf(EvalTestCaseSchema.parse(caseJson)).messages[0].createdAt;
		const second = inlineSeedOf(EvalTestCaseSchema.parse(caseJson)).messages[0].createdAt;
		expect(first).toBe(second);
		expect(Date.parse(String(first))).toBeLessThan(Date.now());
	});

	// A shorthand turn appended after full envelopes stamps at the fixed epoch,
	// which is BEFORE their authored stamps — the store would present it first while
	// `transcriptPrefixFromSeed` still grades array order.
	it('restamps a mixed seed whose authored timestamps do not ascend', () => {
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			seed: {
				mode: 'inline',
				messages: [
					{
						id: 'm1',
						type: 'llm',
						role: 'user',
						createdAt: '2026-06-29T09:00:00.000Z',
						content: [{ type: 'text', text: 'build it' }],
					},
					{ role: 'assistant', text: 'Done.' },
				],
			},
		});
		const at = inlineSeedOf(parsed).messages.map((m) => Date.parse(String(m.createdAt)));
		expect(at[0]).toBeLessThan(at[1]);
		expect(at[1]).toBeLessThan(Date.now());
	});

	// Both arms are strict, so a seed mixing them fails instead of having the
	// wrong-arm field stripped — which would run the case unseeded and grade it
	// as a build from scratch.
	it('rejects a replay seed carrying inline fields', () => {
		expect(() =>
			EvalTestCaseSchema.parse({
				...validFixture(),
				seed: {
					mode: 'replay',
					threadId: 'thread-1',
					messages: [{ role: 'user', text: 'build it' }],
				},
			}),
		).toThrow(/messages/);
	});

	it('rejects an inline seed carrying replay fields', () => {
		expect(() =>
			EvalTestCaseSchema.parse({
				...validFixture(),
				seed: {
					mode: 'inline',
					messages: [{ role: 'user', text: 'build it' }],
					threadId: 'thread-1',
				},
			}),
		).toThrow(/threadId/);
	});

	it('expands a {role, text} shorthand message into a full envelope', () => {
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			seed: {
				mode: 'inline',
				messages: [
					{ role: 'user', text: 'We already agreed on #cosmic-otter-alerts' },
					{ role: 'assistant', text: ['Understood.', 'Posting there.'] },
				],
			},
		});
		const { messages } = inlineSeedOf(parsed);
		expect(messages).toHaveLength(2);
		expect(messages[0]).toMatchObject({
			role: 'user',
			type: 'llm',
			content: [{ type: 'text', text: 'We already agreed on #cosmic-otter-alerts' }],
		});
		expect(messages[0].id).toEqual(expect.any(String));
		// Array-form text is newline-joined, same as an authored conversation turn.
		expect(messages[1]).toMatchObject({
			content: [{ type: 'text', text: 'Understood.\nPosting there.' }],
		});
	});

	it('stamps shorthand timestamps ascending and in the past (before the live turn)', () => {
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			seed: {
				mode: 'inline',
				messages: [
					{ role: 'user', text: 'first' },
					{ role: 'assistant', text: 'second' },
					{ role: 'user', text: 'third' },
				],
			},
		});
		const stamps = inlineSeedOf(parsed).messages.map((m) => Date.parse(String(m.createdAt)));
		expect(stamps).toEqual([...stamps].sort((a, b) => a - b));
		expect(new Set(stamps).size).toBe(3);
		expect(Math.max(...stamps)).toBeLessThan(Date.now());
	});

	it('keeps an authored createdAt when shorthand and full envelopes are mixed', () => {
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			seed: {
				mode: 'inline',
				messages: [
					{ role: 'user', text: 'prose prelude' },
					{
						id: 'm2',
						type: 'llm',
						role: 'assistant',
						createdAt: '2026-06-29T09:00:00.000Z',
						content: [{ type: 'tool-call', toolCallId: 'c1', toolName: 'build-workflow' }],
					},
				],
			},
		});
		const { messages } = inlineSeedOf(parsed);
		expect(messages[1].createdAt).toBe('2026-06-29T09:00:00.000Z');
		// The tool-call block's own keys survive (`.passthrough()`), so the seeded
		// history the agent reads isn't gutted.
		expect(messages[1].content).toEqual([
			{ type: 'tool-call', toolCallId: 'c1', toolName: 'build-workflow' },
		]);
	});

	it('rejects a near-miss shorthand rather than expanding it into a droppable message', () => {
		// `text: 123` is not shorthand, so it falls through to the envelope schema —
		// which fails loudly. Expanding it would produce a text block the transcript
		// builder silently skips (the failure TRUST-357 exists to prevent).
		expect(() =>
			EvalTestCaseSchema.parse({
				...validFixture(),
				seed: { mode: 'inline', messages: [{ role: 'user', text: 123 }] },
			}),
		).toThrow(/full envelope[\s\S]*shorthand/);
	});

	it('accepts an attach on the opening turn naming a seeded workflow', () => {
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			conversation: [
				{ role: 'user', text: 'why is this failing?', attach: { workflow: 'wf12345678' } },
			],
			seed: {
				mode: 'inline',
				messages: [{ role: 'user', text: 'build it' }],
				workflows: [{ id: 'wf12345678', name: 'Batch loop', nodes: [], connections: {} }],
			},
		});
		expect(parsed.conversation?.[0].attach).toEqual({ workflow: 'wf12345678' });
	});

	// An attachment models the user opening the assistant with a workflow already in
	// front of them, so the turn it rides has to BE the user's. An assistant-first
	// opener carrying one would be graded against a transcript that never happened.
	it('rejects an attach on an assistant opening turn', () => {
		expect(() =>
			EvalTestCaseSchema.parse({
				...validFixture(),
				conversation: [
					{ role: 'assistant', text: 'here is what I built', attach: { workflow: 'wf12345678' } },
					{ role: 'user', text: 'why is this failing?' },
				],
				seed: {
					mode: 'inline',
					messages: [{ role: 'user', text: 'build it' }],
					workflows: [{ id: 'wf12345678', name: 'Batch loop', nodes: [], connections: {} }],
				},
			}),
		).toThrow(/attach.*user|user.*attach/i);
	});

	it('rejects an attach on a later turn — an attachment is a hand-off', () => {
		expect(() =>
			EvalTestCaseSchema.parse({
				...validFixture(),
				conversation: [
					{ role: 'user', text: 'why is this failing?' },
					{ role: 'user', text: 'and now this', attach: { workflow: 'wf12345678' } },
				],
				seed: {
					mode: 'inline',
					messages: [{ role: 'user', text: 'build it' }],
					workflows: [{ id: 'wf12345678', name: 'Batch loop', nodes: [], connections: {} }],
				},
			}),
		).toThrow(/only the first conversation turn may carry .attach./);
	});

	it('rejects an attach naming a workflow the seed does not declare', () => {
		// A dangling reference hands the agent nothing and reads as a builder failure.
		expect(() =>
			EvalTestCaseSchema.parse({
				...validFixture(),
				conversation: [{ role: 'user', text: 'why?', attach: { workflow: 'not-in-the-seed' } }],
				seed: {
					mode: 'inline',
					messages: [{ role: 'user', text: 'build it' }],
					workflows: [{ id: 'wf12345678', name: 'Batch loop', nodes: [], connections: {} }],
				},
			}),
		).toThrow(/must be the id of a workflow the inline seed declares/);
	});

	it('rejects an empty opening turn that carries no attach', () => {
		expect(() =>
			EvalTestCaseSchema.parse({
				...validFixture(),
				conversation: [{ role: 'user', text: '' }],
			}),
		).toThrow(/opening turn with empty text must carry .attach./);
	});

	it('rejects an empty LATER turn too — the chat API 400s on it just the same', () => {
		// The guard used to cover only turn 0, so this reached the API mid-run and
		// surfaced as what reads like an infrastructure fault.
		expect(() =>
			EvalTestCaseSchema.parse({
				...validFixture(),
				conversation: [
					{ role: 'user', text: 'build a thing' },
					{ role: 'user', text: '   ' },
				],
			}),
		).toThrow(/a conversation turn needs text/);
	});

	it('leaves an empty ASSISTANT turn alone — script data, never posted to chat', () => {
		// The guard exists for the chat API's 400. Assistant turns are the proxy's
		// script, so an empty one has nothing to do with that rule.
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			conversation: [
				{ role: 'user', text: 'build a thing' },
				{ role: 'assistant', text: '' },
			],
		});
		expect(parsed.conversation?.[1].text).toBe('');
	});

	it('does not tell a replay author to add an attach they cannot use', () => {
		// On a replay case conversation[0] CONTINUES the trace's live turn, and `attach`
		// needs an inline seed to point at — so the opening-turn advice is a dead end.
		expect(() =>
			EvalTestCaseSchema.parse({
				...validFixture(),
				conversation: [{ role: 'user', text: '' }],
				seed: { mode: 'replay', threadId: 'thread-1' },
			}),
		).toThrow(/a conversation turn needs text/);
	});

	it('rejects a seed declaring two workflows with the same id', () => {
		// Restore index-aligns authored ids with remapped ones and rewrites references
		// by id, so a duplicate would silently resolve to the wrong workflow.
		expect(() =>
			EvalTestCaseSchema.parse({
				...validFixture(),
				seed: {
					mode: 'inline',
					messages: [{ role: 'user', text: 'build it' }],
					workflows: [
						{ id: 'wf12345678', name: 'First', nodes: [], connections: {} },
						{ id: 'wf12345678', name: 'Second', nodes: [], connections: {} },
					],
				},
			}),
		).toThrow(/seed workflow ids must be unique/);
	});

	it('accepts an empty opening turn when a seeded workflow is attached', () => {
		// The faithful hand-off shape: opened on a workflow, nothing typed.
		expect(() =>
			EvalTestCaseSchema.parse({
				...validFixture(),
				conversation: [{ role: 'user', text: '', attach: { workflow: 'wf12345678' } }],
				seed: {
					mode: 'inline',
					messages: [{ role: 'user', text: 'build it' }],
					workflows: [{ id: 'wf12345678', name: 'Batch loop', nodes: [], connections: {} }],
				},
			}),
		).not.toThrow();
	});

	it('rejects an attach on a case with no inline seed at all', () => {
		expect(() =>
			EvalTestCaseSchema.parse({
				...validFixture(),
				conversation: [{ role: 'user', text: 'why?', attach: { workflow: 'wf12345678' } }],
			}),
		).toThrow(/must be the id of a workflow the inline seed declares/);
	});

	it('accepts a replay seed with no conversation (live turn from the trace)', () => {
		const { conversation: _omit, ...rest } = validFixture();
		const parsed = EvalTestCaseSchema.parse({
			...rest,
			seed: { mode: 'replay', threadId: 'example-thread-id' },
		});
		expect(replaySeedOf(parsed).threadId).toBe('example-thread-id');
		expect(parsed.conversation).toBeUndefined();
	});

	it('accepts a replay seed WITH a conversation (continuation after the live turn)', () => {
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			seed: { mode: 'replay', threadId: 't1' },
			conversation: [{ role: 'user', text: 'now also add error handling' }],
		});
		expect(replaySeedOf(parsed).threadId).toBe('t1');
		expect(parsed.conversation).toHaveLength(1);
	});

	it('accepts a replay seed carrying a dual-tenant endpoint (US-sourced case)', () => {
		// Cross-repo contract (TRUST-212): LangTracer's buildExportedTestCase emits
		// the endpoint for a US-sourced replay; the harness must retain it (the arm
		// isn't .strict(), so an un-modelled field would be silently stripped and
		// the read would wrongly target home/EU).
		const { conversation: _omit, ...rest } = validFixture();
		const parsed = EvalTestCaseSchema.parse({
			...rest,
			seed: { mode: 'replay', threadId: 't1', endpoint: 'https://api.smith.langchain.com' },
		});
		expect(replaySeedOf(parsed).endpoint).toBe('https://api.smith.langchain.com');
	});

	it('rejects a replay endpoint that is not a URL', () => {
		const { conversation: _omit, ...rest } = validFixture();
		expect(() =>
			EvalTestCaseSchema.parse({
				...rest,
				seed: { mode: 'replay', threadId: 't1', endpoint: 'us' },
			}),
		).toThrow();
	});

	it('retains liveTurnRunId through parse (LangTracer live-turn pin)', () => {
		// Regression guard: the arm is non-strict, so before the field was modelled it
		// was silently stripped on parse and never reached the reconstructor.
		const { conversation: _omit, ...rest } = validFixture();
		const parsed = EvalTestCaseSchema.parse({
			...rest,
			seed: { mode: 'replay', threadId: 't1', liveTurnRunId: 'run-abc-123' },
		});
		expect(replaySeedOf(parsed).liveTurnRunId).toBe('run-abc-123');
	});

	it('rejects an empty-string liveTurnRunId', () => {
		const { conversation: _omit, ...rest } = validFixture();
		expect(() =>
			EvalTestCaseSchema.parse({
				...rest,
				seed: { mode: 'replay', threadId: 't1', liveTurnRunId: '' },
			}),
		).toThrow();
	});

	it('rejects a case that omits conversation without a replay seed', () => {
		const { conversation: _omit, ...rest } = validFixture();
		expect(() => EvalTestCaseSchema.parse(rest)).toThrow(
			/needs a conversation, or a seed with mode: replay/,
		);
		// An inline seed carries no live turn, so it needs one too.
		expect(() =>
			EvalTestCaseSchema.parse({
				...rest,
				seed: { mode: 'inline', messages: [{ role: 'user', text: 'prelude' }] },
			}),
		).toThrow(/needs a conversation, or a seed with mode: replay/);
	});

	it('accepts the optional triggerType field', () => {
		const parsed = EvalTestCaseSchema.parse({ ...validFixture(), triggerType: 'webhook' });
		expect(parsed.triggerType).toBe('webhook');
	});

	it('accepts the optional process/outcome expectation arrays', () => {
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			processExpectations: ['the agent asked which channel before building'],
			outcomeExpectations: ['the final workflow posts to Slack'],
		});
		expect(parsed.processExpectations).toEqual(['the agent asked which channel before building']);
		expect(parsed.outcomeExpectations).toEqual(['the final workflow posts to Slack']);
	});

	it('leaves expectation arrays undefined when omitted', () => {
		const parsed = EvalTestCaseSchema.parse(validFixture());
		expect(parsed.processExpectations).toBeUndefined();
		expect(parsed.outcomeExpectations).toBeUndefined();
	});

	it('rejects a non-array expectation field', () => {
		expect(() =>
			EvalTestCaseSchema.parse({ ...validFixture(), outcomeExpectations: 'nope' }),
		).toThrow();
	});

	it('rejects an empty-string expectation', () => {
		expect(() =>
			EvalTestCaseSchema.parse({ ...validFixture(), processExpectations: [''] }),
		).toThrow();
	});

	it('rejects a legacy buildExpectations key with a migration hint', () => {
		expect(() =>
			EvalTestCaseSchema.parse({
				...validFixture(),
				buildExpectations: ['legacy assertion that would otherwise be silently dropped'],
			}),
		).toThrow(/no longer supported/);
	});

	it('rejects an unknown top-level key instead of silently stripping it', () => {
		expect(() =>
			EvalTestCaseSchema.parse({ ...validFixture(), outcomeExpectaiton: ['typo'] }),
		).toThrow(/[Uu]nrecognized key/);
	});

	it('accepts a credentials entry with a supported type', () => {
		const parsed = EvalTestCaseSchema.parse({
			...validFixture(),
			credentials: [{ type: 'slackApi' }, { type: 'notionApi', name: 'My Notion' }],
		});
		expect(parsed.credentials).toEqual([
			{ type: 'slackApi' },
			{ type: 'notionApi', name: 'My Notion' },
		]);
	});

	it('rejects a credentials entry with an unknown type', () => {
		expect(() =>
			EvalTestCaseSchema.parse({ ...validFixture(), credentials: [{ type: 'madeUpApi' }] }),
		).toThrow(/unknown credential type/);
	});

	it('leaves credentials undefined when omitted', () => {
		const parsed = EvalTestCaseSchema.parse(validFixture());
		expect(parsed.credentials).toBeUndefined();
	});

	it('accepts the optional requires hint on scenarios', () => {
		const fixture = validFixture();
		fixture.executionScenarios[0] = {
			...fixture.executionScenarios[0],
			requires: 'mock-server',
		} as (typeof fixture.executionScenarios)[number];
		const parsed = EvalTestCaseSchema.parse(fixture);
		expect(parsed.executionScenarios![0].requires).toBe('mock-server');
	});
});

describe('loadWorkflowTestCasesWithFiles · file-aware errors', () => {
	it('loads a valid fixture and exposes the fileSlug', () => {
		mockedReadFile.mockReturnValue(JSON.stringify(validFixture()));
		const result = loadWorkflowTestCasesWithFiles();
		expect(result).toHaveLength(1);
		expect(result[0].fileSlug).toBe('demo');
	});

	it('throws with the file path on malformed JSON', () => {
		mockedReadFile.mockReturnValue('{ not json');
		expect(() => loadWorkflowTestCasesWithFiles()).toThrow(/demo\.json/);
	});

	it('throws with the file path on a schema validation failure', () => {
		mockedReadFile.mockReturnValue(JSON.stringify({ conversation: [] }));
		expect(() => loadWorkflowTestCasesWithFiles()).toThrow(/demo\.json/);
		expect(() => loadWorkflowTestCasesWithFiles()).toThrow(/complexity/);
	});
});

describe('EvalTestCaseSchema · artifact grading via outcome expectations', () => {
	it('accepts a workflow case graded only by outcomeExpectations (no scenarios)', () => {
		const { executionScenarios: _omit, ...rest } = validFixture();
		const parsed = EvalTestCaseSchema.parse({
			...rest,
			outcomeExpectations: ['the final workflow posts to Slack'],
		});
		expect(parsed.outcomeExpectations).toEqual(['the final workflow posts to Slack']);
	});

	it('accepts an agent-style case graded only by outcomeExpectations (no scenarios)', () => {
		const { executionScenarios: _omit, ...rest } = validFixture();
		const parsed = EvalTestCaseSchema.parse({
			...rest,
			outcomeExpectations: ['an agent was created and no workflow was built'],
		});
		expect(parsed.outcomeExpectations).toEqual(['an agent was created and no workflow was built']);
	});

	it('rejects a case with no scenario and no process/outcome expectation', () => {
		const { executionScenarios: _omit, ...rest } = validFixture();
		expect(() => EvalTestCaseSchema.parse(rest)).toThrow(
			/needs at least one executionScenario, or a process\/outcome expectation/,
		);
	});

	it('rejects the removed expectedArtifacts / artifactExpectations fields (strict schema)', () => {
		// Artifact grading moved onto outcomeExpectations — these case fields no longer exist,
		// and the strict schema rejects them so a stale case fails loudly rather than silently.
		expect(() =>
			EvalTestCaseSchema.parse({ ...validFixture(), expectedArtifacts: ['agent'] }),
		).toThrow();
		expect(() =>
			EvalTestCaseSchema.parse({
				...validFixture(),
				artifactExpectations: { agent: ['the agent has a Slack tool'] },
			}),
		).toThrow();
	});
});

describe('conversationTurnTextSchema', () => {
	it('passes a plain string through unchanged', () => {
		expect(conversationTurnTextSchema.parse('one line')).toBe('one line');
	});

	it('joins an array of lines with newlines', () => {
		// The mcp-manifest builder reuses this, so the array form must normalize
		// to a string before its buildPromptFromConversation calls .text.trim().
		expect(conversationTurnTextSchema.parse(['line 1', 'line 2'])).toBe('line 1\nline 2');
	});
});
