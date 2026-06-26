/* eslint-disable import-x/order */
import { vi } from 'vitest';

vi.mock('fs', () => ({
	readdirSync: vi.fn(),
	readFileSync: vi.fn(),
}));

import { readdirSync, readFileSync } from 'fs';

import { loadWorkflowTestCasesWithFiles } from '../data/workflows';
import { WorkflowTestCaseSchema, conversationTurnTextSchema } from '../data/workflows/schema';

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

beforeEach(() => {
	vi.clearAllMocks();
	mockedReaddir.mockReturnValue(['demo.json'] as unknown as ReturnType<typeof readdirSync>);
});

describe('WorkflowTestCaseSchema', () => {
	it('accepts a minimal valid fixture', () => {
		const parsed = WorkflowTestCaseSchema.parse(validFixture());
		expect(parsed.executionScenarios).toHaveLength(1);
		expect(parsed.conversation[0].role).toBe('user');
	});

	it('rejects an empty conversation', () => {
		expect(() => WorkflowTestCaseSchema.parse({ ...validFixture(), conversation: [] })).toThrow();
	});

	it('normalizes an array-form turn text to a newline-joined string', () => {
		const parsed = WorkflowTestCaseSchema.parse({
			...validFixture(),
			conversation: [{ role: 'user', text: ['line 1', 'line 2'] }],
		});
		expect(parsed.conversation[0].text).toBe('line 1\nline 2');
	});

	it('rejects an empty executionScenarios array', () => {
		expect(() =>
			WorkflowTestCaseSchema.parse({ ...validFixture(), executionScenarios: [] }),
		).toThrow();
	});

	it('rejects an unknown complexity value', () => {
		expect(() =>
			WorkflowTestCaseSchema.parse({ ...validFixture(), complexity: 'gigantic' }),
		).toThrow();
	});

	it('accepts a prose priorConversation prelude', () => {
		const parsed = WorkflowTestCaseSchema.parse({
			...validFixture(),
			priorConversation: [{ role: 'user', text: 'We already agreed on #cosmic-otter-alerts' }],
		});
		expect(parsed.priorConversation).toHaveLength(1);
	});

	it('rejects seedFile combined with priorConversation', () => {
		expect(() =>
			WorkflowTestCaseSchema.parse({
				...validFixture(),
				seedFile: 'seeds/some-thread.seed.json',
				priorConversation: [{ role: 'user', text: 'prelude' }],
			}),
		).toThrow(/mutually exclusive/);
	});

	it('accepts a seedThread case with no conversation (live turn from the trace)', () => {
		const { conversation: _omit, ...rest } = validFixture();
		const parsed = WorkflowTestCaseSchema.parse({
			...rest,
			seedThread: { threadId: 'example-thread-id' },
		});
		expect(parsed.seedThread?.threadId).toBe('example-thread-id');
		expect(parsed.conversation).toBeUndefined();
	});

	it('accepts seedThread WITH a conversation (continuation after the live turn)', () => {
		const parsed = WorkflowTestCaseSchema.parse({
			...validFixture(),
			seedThread: { threadId: 't1' },
			conversation: [{ role: 'user', text: 'now also add error handling' }],
		});
		expect(parsed.seedThread?.threadId).toBe('t1');
		expect(parsed.conversation).toHaveLength(1);
	});

	it('rejects seedThread combined with another seeding mode', () => {
		const { conversation: _omit, ...rest } = validFixture();
		expect(() =>
			WorkflowTestCaseSchema.parse({
				...rest,
				seedThread: { threadId: 't1' },
				seedFile: 'seeds/x.seed.json',
			}),
		).toThrow(/mutually exclusive/);
	});

	it('rejects a non-seedThread case that omits conversation', () => {
		const { conversation: _omit, ...rest } = validFixture();
		expect(() => WorkflowTestCaseSchema.parse(rest)).toThrow(
			/needs a conversation, or a seedThread/,
		);
	});

	it('accepts the optional triggerType field', () => {
		const parsed = WorkflowTestCaseSchema.parse({ ...validFixture(), triggerType: 'webhook' });
		expect(parsed.triggerType).toBe('webhook');
	});

	it('accepts the optional process/outcome expectation arrays', () => {
		const parsed = WorkflowTestCaseSchema.parse({
			...validFixture(),
			processExpectations: ['the agent asked which channel before building'],
			outcomeExpectations: ['the final workflow posts to Slack'],
		});
		expect(parsed.processExpectations).toEqual(['the agent asked which channel before building']);
		expect(parsed.outcomeExpectations).toEqual(['the final workflow posts to Slack']);
	});

	it('leaves expectation arrays undefined when omitted', () => {
		const parsed = WorkflowTestCaseSchema.parse(validFixture());
		expect(parsed.processExpectations).toBeUndefined();
		expect(parsed.outcomeExpectations).toBeUndefined();
	});

	it('rejects a non-array expectation field', () => {
		expect(() =>
			WorkflowTestCaseSchema.parse({ ...validFixture(), outcomeExpectations: 'nope' }),
		).toThrow();
	});

	it('rejects an empty-string expectation', () => {
		expect(() =>
			WorkflowTestCaseSchema.parse({ ...validFixture(), processExpectations: [''] }),
		).toThrow();
	});

	it('rejects a legacy buildExpectations key with a migration hint', () => {
		expect(() =>
			WorkflowTestCaseSchema.parse({
				...validFixture(),
				buildExpectations: ['legacy assertion that would otherwise be silently dropped'],
			}),
		).toThrow(/no longer supported/);
	});

	it('rejects an unknown top-level key instead of silently stripping it', () => {
		expect(() =>
			WorkflowTestCaseSchema.parse({ ...validFixture(), outcomeExpectaiton: ['typo'] }),
		).toThrow(/[Uu]nrecognized key/);
	});

	it('accepts a credentials entry with a supported type', () => {
		const parsed = WorkflowTestCaseSchema.parse({
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
			WorkflowTestCaseSchema.parse({ ...validFixture(), credentials: [{ type: 'madeUpApi' }] }),
		).toThrow(/unknown credential type/);
	});

	it('leaves credentials undefined when omitted', () => {
		const parsed = WorkflowTestCaseSchema.parse(validFixture());
		expect(parsed.credentials).toBeUndefined();
	});

	it('accepts the optional requires hint on scenarios', () => {
		const fixture = validFixture();
		fixture.executionScenarios[0] = {
			...fixture.executionScenarios[0],
			requires: 'mock-server',
		} as (typeof fixture.executionScenarios)[number];
		const parsed = WorkflowTestCaseSchema.parse(fixture);
		expect(parsed.executionScenarios[0].requires).toBe('mock-server');
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
		expect(() => loadWorkflowTestCasesWithFiles()).toThrow(/executionScenarios/);
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
