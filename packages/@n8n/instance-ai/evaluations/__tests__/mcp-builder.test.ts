import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
	buildAllowedTools,
	buildPromptFromConversation,
	buildWorkflowViaMcp,
	MCP_BUILD_KEY_SUPPORT,
	mergeToolCalls,
	parseClaudeStream,
	sanitizeServerName,
	stageLaneMcpConfig,
	tailWorkflowId,
	TOOL_ERROR_MESSAGE_CAP,
	uniqueProjectScopes,
	unsupportedMcpBuildSetupFields,
} from '../cli/mcp-builder';
import { WORKFLOW_TEST_CASE_KEYS } from '../harness/schema';
import type { ConversationTurn, WorkflowTestCase } from '../types';

vi.mock('child_process', () => ({ spawn: vi.fn() }));

const user = (text: string): ConversationTurn => ({ role: 'user', text });
const assistant = (text: string): ConversationTurn => ({ role: 'assistant', text });

const testCase = (overrides: Partial<WorkflowTestCase> = {}): WorkflowTestCase => ({
	conversation: [user('Build a contact form')],
	complexity: 'simple',
	tags: [],
	datasets: ['full'],
	...overrides,
});

describe('buildPromptFromConversation', () => {
	it('returns the single user turn verbatim', () => {
		expect(buildPromptFromConversation([user('Build a contact form')])).toBe(
			'Build a contact form',
		);
	});

	it('ignores assistant turns when picking the request', () => {
		const prompt = buildPromptFromConversation([user('Build a form'), assistant('Sure!')]);
		expect(prompt).toBe('Build a form');
	});

	it('flattens additional user turns as numbered additive requirements', () => {
		const prompt = buildPromptFromConversation([
			user('Build a form'),
			assistant('ok'),
			user('Email me on submit'),
			user('Store in a data table'),
		]);
		expect(prompt).toContain('Build a form');
		expect(prompt).toContain('Additional details from the user:');
		expect(prompt).toContain('1. Email me on submit');
		expect(prompt).toContain('2. Store in a data table');
		expect(prompt).toContain("I'll set them up later");
	});

	it('trims whitespace and drops empty user turns', () => {
		const prompt = buildPromptFromConversation([user('  Build a form  '), user('   ')]);
		expect(prompt).toBe('Build a form');
	});

	it('falls back to the first turn when there is no user turn', () => {
		expect(buildPromptFromConversation([assistant('only assistant')])).toBe('only assistant');
	});

	it('returns empty string for an empty conversation', () => {
		expect(buildPromptFromConversation([])).toBe('');
	});
});

describe('tailWorkflowId', () => {
	it('extracts a WORKFLOW_ID token', () => {
		expect(tailWorkflowId('done\nWORKFLOW_ID=abc123')).toBe('abc123');
	});

	it('returns the LAST id when several are present', () => {
		expect(tailWorkflowId('WORKFLOW_ID=first\n...\nWORKFLOW_ID=second')).toBe('second');
	});

	it('accepts ids with hyphens and underscores', () => {
		expect(tailWorkflowId('WORKFLOW_ID=wf_9-Ab')).toBe('wf_9-Ab');
	});

	it('returns null when no id is present', () => {
		expect(tailWorkflowId('the model forgot to print it')).toBeNull();
	});
});

describe('sanitizeServerName / buildAllowedTools', () => {
	it('replaces non-alphanumeric characters (except hyphen) with underscore', () => {
		expect(sanitizeServerName('n8n-mcp (instance)')).toBe('n8n-mcp__instance_');
		expect(sanitizeServerName('n8n-local')).toBe('n8n-local');
	});

	it('builds the mcp__ tool allowlist prefix', () => {
		expect(buildAllowedTools('n8n-local')).toEqual(['mcp__n8n-local']);
		expect(buildAllowedTools('n8n-mcp (instance)')).toEqual(['mcp__n8n-mcp__instance_']);
	});
});

describe('uniqueProjectScopes', () => {
	it('drops undefined and deduplicates while preserving order', () => {
		expect(uniqueProjectScopes(['/a', undefined, '/b', '/a', undefined, '/c'])).toEqual([
			'/a',
			'/b',
			'/c',
		]);
	});
});

describe('unsupportedMcpBuildSetupFields', () => {
	it('classifies every test-case schema key, so adding a field forces a decision', () => {
		// MCP_BUILD_KEY_SUPPORT must stay in lockstep with the case schema: a new
		// build-side setup field left unclassified would let --build-via-mcp build
		// cases without their prerequisites and report misleading failures.
		expect([...Object.keys(MCP_BUILD_KEY_SUPPORT)].sort()).toEqual(
			[...WORKFLOW_TEST_CASE_KEYS].sort(),
		);
	});

	it('returns no fields for a plain conversation-only case', () => {
		expect(unsupportedMcpBuildSetupFields(testCase())).toEqual([]);
	});

	it('treats an empty credentials array as supported', () => {
		expect(unsupportedMcpBuildSetupFields(testCase({ credentials: [] }))).toEqual([]);
	});

	it('does not flag messageBudget (inapplicable to a single-shot claude build)', () => {
		expect(unsupportedMcpBuildSetupFields(testCase({ messageBudget: 6 }))).toEqual([]);
	});

	// One `seed` entry covers every mode: the classification keys off the slot, not
	// the mode, so a new arm needs no edit here.
	it.each<[string, string, Partial<WorkflowTestCase>]>([
		['credentials', 'credentials', { credentials: [{ type: 'slackApi' }] }],
		[
			'an inline seed',
			'seed',
			{
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
					workflows: [],
					dataTables: [],
				},
			},
		],
		['a replay seed', 'seed', { seed: { mode: 'replay', threadId: 't1' } }],
	])('flags %s', (_label, field, overrides) => {
		expect(unsupportedMcpBuildSetupFields(testCase(overrides))).toEqual([field]);
	});

	it('flags multiple declared fields together', () => {
		expect(
			unsupportedMcpBuildSetupFields(
				testCase({
					credentials: [{ type: 'slackApi' }],
					seed: { mode: 'replay', threadId: 't1' },
				}),
			),
		).toEqual(['credentials', 'seed']);
	});
});

// --- stream-json fixtures: one NDJSON line per emitted `claude` event ---

/** The stream's trailing `result` event (session totals + final text). */
const resultLine = (session: Record<string, unknown>): string =>
	JSON.stringify({ type: 'result', ...session });

/** An assistant turn spending itself on `tool_use` calls to the named tools. */
const assistantLine = (...toolNames: string[]): string =>
	JSON.stringify({
		type: 'assistant',
		message: {
			content: toolNames.map((name, i) => ({
				type: 'tool_use',
				id: `toolu_${String(i)}`,
				name,
				input: {},
			})),
		},
	});

/** A single-call assistant turn with an explicit `tool_use` id, for pairing
 *  with toolResultLine in error-correlation fixtures. */
const toolUseLine = (id: string, name: string): string =>
	JSON.stringify({
		type: 'assistant',
		message: { content: [{ type: 'tool_use', id, name, input: {} }] },
	});

/** The `user` event closing a `tool_use` call, optionally as an error. */
const toolResultLine = (toolUseId: string, content: unknown, isError = false): string =>
	JSON.stringify({
		type: 'user',
		message: {
			content: [{ type: 'tool_result', tool_use_id: toolUseId, is_error: isError, content }],
		},
	});

const stream = (...lines: string[]): string => lines.join('\n') + '\n';

describe('parseClaudeStream', () => {
	it('extracts the session from the trailing result event', () => {
		const { session } = parseClaudeStream(
			stream(
				assistantLine('mcp__n8n-local__search_nodes'),
				resultLine({ result: 'done\nWORKFLOW_ID=wf1', num_turns: 3, subtype: 'success' }),
			),
		);
		expect(session?.result).toBe('done\nWORKFLOW_ID=wf1');
		expect(session?.num_turns).toBe(3);
		expect(session?.subtype).toBe('success');
	});

	it('counts tool_use blocks per tool across assistant turns', () => {
		const { toolCalls } = parseClaudeStream(
			stream(
				assistantLine('mcp__n8n-local__search_nodes'),
				assistantLine('mcp__n8n-local__search_nodes', 'mcp__n8n-local__get_node_details'),
				assistantLine('mcp__n8n-local__create_workflow_from_code'),
				resultLine({ result: 'done' }),
			),
		);
		expect(toolCalls).toEqual({
			'mcp__n8n-local__search_nodes': 2,
			'mcp__n8n-local__get_node_details': 1,
			'mcp__n8n-local__create_workflow_from_code': 1,
		});
	});

	it('ignores text-only assistant turns and non-assistant events', () => {
		const textTurn = JSON.stringify({
			type: 'assistant',
			message: { content: [{ type: 'text', text: 'thinking about it' }] },
		});
		const userEvent = JSON.stringify({
			type: 'user',
			message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_0', content: 'ok' }] },
		});
		const initEvent = JSON.stringify({ type: 'system', subtype: 'init' });
		const { session, toolCalls } = parseClaudeStream(
			stream(initEvent, textTurn, userEvent, resultLine({ result: 'done' })),
		);
		expect(toolCalls).toEqual({});
		expect(session?.result).toBe('done');
	});

	it('yields partial attribution from a truncated stream (no result event)', () => {
		const truncated =
			stream(assistantLine('mcp__n8n-local__create_workflow_from_code')) +
			'{"type":"assistant","message":{"conte'; // cut mid-write by a kill
		const { session, toolCalls } = parseClaudeStream(truncated);
		expect(session).toBeUndefined();
		expect(toolCalls).toEqual({ 'mcp__n8n-local__create_workflow_from_code': 1 });
	});

	it('returns no session for empty or non-JSON output', () => {
		expect(parseClaudeStream('').session).toBeUndefined();
		expect(parseClaudeStream('claude: command failed\n').session).toBeUndefined();
	});

	it('records errored tool calls with the error message, matched by tool_use_id', () => {
		const { toolCalls, toolErrors } = parseClaudeStream(
			stream(
				toolUseLine('toolu_a', 'mcp__n8n-local__create_workflow_from_code'),
				toolResultLine('toolu_a', 'Invalid workflow: node "Slack" is missing credentials', true),
				toolUseLine('toolu_b', 'mcp__n8n-local__create_workflow_from_code'),
				toolResultLine('toolu_b', 'Created workflow wf1'),
				resultLine({ result: 'done\nWORKFLOW_ID=wf1' }),
			),
		);
		// Errored calls still count as calls — errors are the failure subset.
		expect(toolCalls).toEqual({ 'mcp__n8n-local__create_workflow_from_code': 2 });
		expect(toolErrors).toEqual([
			{
				tool: 'mcp__n8n-local__create_workflow_from_code',
				message: 'Invalid workflow: node "Slack" is missing credentials',
			},
		]);
	});

	it('flattens array-form tool_result content into the error message', () => {
		const { toolErrors } = parseClaudeStream(
			stream(
				toolUseLine('toolu_a', 'mcp__n8n-local__search_nodes'),
				toolResultLine(
					'toolu_a',
					[
						{ type: 'text', text: 'MCP error -32603:' },
						{ type: 'text', text: 'request timed out' },
					],
					true,
				),
			),
		);
		expect(toolErrors).toEqual([
			{ tool: 'mcp__n8n-local__search_nodes', message: 'MCP error -32603:\nrequest timed out' },
		]);
	});

	it('caps recorded error messages at TOOL_ERROR_MESSAGE_CAP', () => {
		const { toolErrors } = parseClaudeStream(
			stream(
				toolUseLine('toolu_a', 'mcp__n8n-local__create_workflow_from_code'),
				toolResultLine('toolu_a', 'x'.repeat(TOOL_ERROR_MESSAGE_CAP + 100), true),
			),
		);
		expect(toolErrors[0].message).toHaveLength(TOOL_ERROR_MESSAGE_CAP + 1); // cap + ellipsis
		expect(toolErrors[0].message.endsWith('…')).toBe(true);
	});

	it('attributes an error whose tool_use_id was never seen to "(unknown)"', () => {
		const { toolErrors } = parseClaudeStream(stream(toolResultLine('toolu_orphan', 'boom', true)));
		expect(toolErrors).toEqual([{ tool: '(unknown)', message: 'boom' }]);
	});
});

describe('mergeToolCalls', () => {
	it('accumulates counts across records', () => {
		const into = { a: 1 };
		mergeToolCalls(into, { a: 2, b: 1 });
		mergeToolCalls(into, { b: 1 });
		expect(into).toEqual({ a: 3, b: 2 });
	});
});

/** Minimal stand-in for the `claude` child process: event surface only.
 *  `pid === undefined` mirrors Node's contract for a process that failed
 *  to spawn (the 'error' → 'close' sequence still fires). */
class FakeChild extends EventEmitter {
	stdout = new EventEmitter();
	stderr = new EventEmitter();
	kill = vi.fn();

	constructor(readonly pid: number | undefined) {
		super();
	}
}

describe('buildWorkflowViaMcp', () => {
	const settings = {
		serverName: 'n8n-local',
		model: 'claude-test',
		maxAttempts: 3,
		mcpTimeoutMs: 1_000,
	};
	let logDir: string;

	const buildOpts = () => ({
		conversation: [user('Build a contact form')],
		slug: 'case',
		iteration: 0,
		mcpConfigPath: '/tmp/mcp-config.json',
		settings,
		logDir,
		log: () => {},
	});

	const spawnReturning = (makeChild: () => FakeChild): void => {
		vi.mocked(spawn).mockImplementation(() => {
			return makeChild() as unknown as ReturnType<typeof spawn>;
		});
	};

	beforeEach(() => {
		vi.mocked(spawn).mockReset();
		logDir = mkdtempSync(join(tmpdir(), 'mcp-builder-test-'));
	});

	afterEach(() => {
		rmSync(logDir, { recursive: true, force: true });
	});

	it('short-circuits retries on spawn failure and persists the error to the log file', async () => {
		spawnReturning(() => {
			const child = new FakeChild(undefined);
			setImmediate(() => {
				child.emit('error', new Error('spawn claude ENOENT'));
				// Node emits 'close' even when the process failed to spawn.
				child.emit('close', -2, null);
			});
			return child;
		});

		const result = await buildWorkflowViaMcp(buildOpts());

		expect(result.workflowId).toBeNull();
		expect(result.failureReason).toBe('spawn-error');
		expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
		expect(result.logFile).not.toBeNull();
		const logged = readFileSync(String(result.logFile), 'utf-8');
		expect(logged).toBe(JSON.stringify({ subtype: 'spawn-error', error: 'spawn claude ENOENT' }));
	});

	it('retries up to maxAttempts when claude exits without a WORKFLOW_ID', async () => {
		spawnReturning(() => {
			const child = new FakeChild(1234);
			setImmediate(() => {
				child.stdout.emit(
					'data',
					Buffer.from(stream(resultLine({ result: 'built something, forgot the id' }))),
				);
				child.emit('close', 0, null);
			});
			return child;
		});

		const result = await buildWorkflowViaMcp(buildOpts());

		expect(result.workflowId).toBeNull();
		expect(result.failureReason).toBe('no-stdout');
		expect(vi.mocked(spawn)).toHaveBeenCalledTimes(3);
	});

	it('returns the workflow id and per-tool attribution from a successful first attempt', async () => {
		const events = stream(
			assistantLine('mcp__n8n-local__search_nodes'),
			assistantLine('mcp__n8n-local__create_workflow_from_code'),
			resultLine({ result: 'done\nWORKFLOW_ID=wf123' }),
		);
		spawnReturning(() => {
			const child = new FakeChild(1234);
			setImmediate(() => {
				child.stdout.emit('data', Buffer.from(events));
				child.emit('close', 0, null);
			});
			return child;
		});

		const result = await buildWorkflowViaMcp(buildOpts());

		expect(result.workflowId).toBe('wf123');
		expect(result.failureReason).toBeUndefined();
		expect(result.toolCalls).toEqual({
			'mcp__n8n-local__search_nodes': 1,
			'mcp__n8n-local__create_workflow_from_code': 1,
		});
		expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
		// The stream flag pair is what makes the persisted log per-event.
		const claudeArgs = vi.mocked(spawn).mock.calls[0][1] as string[];
		expect(claudeArgs).toContain('stream-json');
		expect(claudeArgs).toContain('--verbose');
		// The event stream is persisted verbatim, as NDJSON.
		expect(result.logFile).toMatch(/\.jsonl$/);
		expect(readFileSync(String(result.logFile), 'utf-8')).toBe(events);
	});

	it('sums cost, turns, duration and tool calls across attempts — failed attempts cost money too', async () => {
		let call = 0;
		spawnReturning(() => {
			const child = new FakeChild(1234);
			call++;
			const events =
				call === 1
					? stream(
							toolUseLine('toolu_a', 'mcp__n8n-local__create_workflow_from_code'),
							toolResultLine('toolu_a', 'validation failed: unknown node type', true),
							resultLine({
								result: 'built something, forgot the id',
								total_cost_usd: 0.1,
								num_turns: 2,
								duration_ms: 1000,
							}),
						)
					: stream(
							assistantLine('mcp__n8n-local__search_nodes'),
							assistantLine('mcp__n8n-local__create_workflow_from_code'),
							resultLine({
								result: 'done\nWORKFLOW_ID=wf42',
								total_cost_usd: 0.25,
								num_turns: 5,
								duration_ms: 3000,
							}),
						);
			setImmediate(() => {
				child.stdout.emit('data', Buffer.from(events));
				child.emit('close', 0, null);
			});
			return child;
		});

		const result = await buildWorkflowViaMcp(buildOpts());

		expect(result.workflowId).toBe('wf42');
		expect(result.cost).toBeCloseTo(0.35);
		expect(result.turns).toBe(7);
		expect(result.durationMs).toBe(4000);
		expect(result.toolCalls).toEqual({
			'mcp__n8n-local__create_workflow_from_code': 2,
			'mcp__n8n-local__search_nodes': 1,
		});
		// The failed attempt's errored call is part of the build's record too.
		expect(result.toolErrors).toEqual([
			{
				tool: 'mcp__n8n-local__create_workflow_from_code',
				message: 'validation failed: unknown node type',
			},
		]);
		expect(vi.mocked(spawn)).toHaveBeenCalledTimes(2);
	});
});

describe('stageLaneMcpConfig', () => {
	it('writes an http MCP server block with a bearer header and 0600 mode', () => {
		const path = stageLaneMcpConfig({
			serverName: 'n8n-local',
			url: 'http://localhost:5678/mcp-server/http',
			apiKey: 'jwt-token',
		});
		try {
			const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'));
			expect(parsed).toEqual({
				mcpServers: {
					'n8n-local': {
						type: 'http',
						url: 'http://localhost:5678/mcp-server/http',
						headers: { Authorization: 'Bearer jwt-token' },
					},
				},
			});
			// Config carries a bearer token — must not be world-readable.
			expect(statSync(path).mode & 0o777).toBe(0o600);
		} finally {
			rmSync(path, { force: true });
		}
	});

	it('stages unique paths for concurrent lanes', () => {
		const base = { serverName: 'n8n-local', url: 'http://localhost:5678/mcp-server/http' };
		const a = stageLaneMcpConfig({ ...base, apiKey: 'a' });
		const b = stageLaneMcpConfig({ ...base, apiKey: 'b' });
		try {
			expect(a).not.toBe(b);
		} finally {
			rmSync(a, { force: true });
			rmSync(b, { force: true });
		}
	});
});
