import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
	buildAllowedTools,
	buildPromptFromConversation,
	buildWorkflowViaMcp,
	isolatedClaudeAuthError,
	MCP_BUILD_KEY_SUPPORT,
	sanitizeServerName,
	stageLaneMcpConfig,
	tailWorkflowId,
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
	it.each([undefined, false])('allows user execution setting %s', (allowUserExecution) => {
		expect(unsupportedMcpBuildSetupFields(testCase({ allowUserExecution }))).toEqual([]);
	});

	it('rejects cases that enable user execution', () => {
		expect(unsupportedMcpBuildSetupFields(testCase({ allowUserExecution: true }))).toEqual([
			'allowUserExecution',
		]);
	});

	it.each(['default', 'progressive'] as const)(
		'keeps explicit mode %s unsupported',
		(buildMode) => {
			expect(unsupportedMcpBuildSetupFields(testCase({ buildMode }))).toEqual(['buildMode']);
		},
	);
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

	it('does not flag declared credentials (the fused path seeds them per-case)', () => {
		expect(
			unsupportedMcpBuildSetupFields(testCase({ credentials: [{ type: 'slackApi' }] })),
		).toEqual([]);
	});

	it('does not flag messageBudget (inapplicable to a single-shot claude build)', () => {
		expect(unsupportedMcpBuildSetupFields(testCase({ messageBudget: 6 }))).toEqual([]);
	});

	// One `seed` entry covers every mode: the classification keys off the slot, not
	// the mode, so a new arm needs no edit here.
	it.each<[string, Partial<WorkflowTestCase>]>([
		[
			'an inline seed',
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
					agents: [],
					folders: [],
					projects: [],
				},
			},
		],
		['a replay seed', { seed: { mode: 'replay', threadId: 't1' } }],
	])('does not flag %s (the fused path restores it per build)', (_label, overrides) => {
		expect(unsupportedMcpBuildSetupFields(testCase(overrides))).toEqual([]);
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

/** A spawned child that prints `events` as stream-json lines, then exits. */
const emitting = (events: object[]): FakeChild => {
	const child = new FakeChild(1234);
	setImmediate(() => {
		child.stdout.emit('data', Buffer.from(events.map((e) => JSON.stringify(e)).join('\n') + '\n'));
		child.emit('close', 0, null);
	});
	return child;
};

const resultEvent = (fields: Record<string, unknown>) => ({
	type: 'result',
	subtype: 'success',
	...fields,
});

const initEvent = (sessionId: string) => ({
	type: 'system',
	subtype: 'init',
	session_id: sessionId,
});

const assistantEvent = (...content: object[]) => ({ type: 'assistant', message: { content } });

const toolResultEvent = (toolUseId: string, text: string, isError = false) => ({
	type: 'user',
	message: {
		content: [
			{
				type: 'tool_result',
				tool_use_id: toolUseId,
				content: [{ type: 'text', text }],
				is_error: isError,
			},
		],
	},
});

type SpawnCall = [string, string[], { cwd?: string; env?: Record<string, string | undefined> }];
const spawnCall = (index: number): SpawnCall => vi.mocked(spawn).mock.calls[index] as SpawnCall;

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
		expect(logged.trim()).toBe(
			JSON.stringify({ subtype: 'spawn-error', error: 'spawn claude ENOENT' }),
		);
	});

	it('retries up to maxAttempts when claude exits without a WORKFLOW_ID', async () => {
		spawnReturning(() => emitting([resultEvent({ result: 'built something, forgot the id' })]));

		const result = await buildWorkflowViaMcp(buildOpts());

		expect(result.workflowId).toBeNull();
		// The session's result text is appended so an upstream provider error can
		// be classified downstream; the subtype still leads.
		expect(result.failureReason).toContain('success');
		expect(vi.mocked(spawn)).toHaveBeenCalledTimes(3);
	});

	// TRUST-374: a provider outage inside `claude` reached the orchestrator as a
	// bare subtype, so `findProviderOutage` had nothing to match and the run was
	// filed as a BUILDER failure. The session's own error text has to ride along.
	it('carries the provider error text out, not just the session subtype', async () => {
		spawnReturning(() =>
			emitting([
				resultEvent({
					subtype: 'error_during_execution',
					result: 'AI_APICallError: Overloaded (HTTP 529)',
				}),
			]),
		);

		// One attempt: the provider backoff between retries is exercised separately;
		// this pins that the evidence survives into `failureReason`.
		const result = await buildWorkflowViaMcp({
			...buildOpts(),
			settings: { ...settings, maxAttempts: 1 },
		});

		expect(result.workflowId).toBeNull();
		expect(result.failureReason).toContain('error_during_execution');
		expect(result.failureReason).toContain('AI_APICallError');
	});

	it('returns the workflow id from a successful first attempt', async () => {
		spawnReturning(() => emitting([resultEvent({ result: 'done\nWORKFLOW_ID=wf123' })]));

		const result = await buildWorkflowViaMcp(buildOpts());

		expect(result.workflowId).toBe('wf123');
		expect(result.failureReason).toBeUndefined();
		expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
	});

	it('sums cost, turns and duration across attempts — failed attempts cost money too', async () => {
		let call = 0;
		spawnReturning(() => {
			call++;
			const session =
				call === 1
					? {
							result: 'built something, forgot the id',
							total_cost_usd: 0.1,
							num_turns: 2,
							duration_ms: 1000,
						}
					: {
							result: 'done\nWORKFLOW_ID=wf42',
							total_cost_usd: 0.25,
							num_turns: 5,
							duration_ms: 3000,
						};
			return emitting([resultEvent(session)]);
		});

		const result = await buildWorkflowViaMcp(buildOpts());

		expect(result.workflowId).toBe('wf42');
		expect(result.cost).toBeCloseTo(0.35);
		expect(result.turns).toBe(7);
		expect(result.durationMs).toBe(4000);
		expect(vi.mocked(spawn)).toHaveBeenCalledTimes(2);
	});

	it('builds the transcript from the stream and reads the id from the tool result', async () => {
		spawnReturning(() =>
			emitting([
				initEvent('sess-1'),
				assistantEvent(
					{ type: 'thinking', thinking: 'hidden' },
					{ type: 'text', text: 'Creating it now.' },
					{
						type: 'tool_use',
						id: 'tu-1',
						name: 'mcp__n8n-local__create_workflow_from_code',
						input: { code: 'workflow()' },
					},
				),
				toolResultEvent('tu-1', JSON.stringify({ workflowId: 'wfT', name: 'Form' })),
				assistantEvent({ type: 'text', text: 'Done.' }),
				resultEvent({ result: 'Done.', session_id: 'sess-1' }),
			]),
		);

		const result = await buildWorkflowViaMcp(buildOpts());

		expect(result.workflowId).toBe('wfT');
		expect(result.transcript).toEqual([
			{
				userMessage: 'Build a contact form',
				steps: [
					{ kind: 'agent-text', text: 'Creating it now.' },
					{
						kind: 'tool-call',
						toolName: 'create_workflow_from_code',
						toolCallId: 'tu-1',
						args: { code: 'workflow()' },
						result: { workflowId: 'wfT', name: 'Form' },
					},
					{ kind: 'agent-text', text: 'Done.' },
				],
			},
		]);
	});

	it('treats an Agent from create_agent as a build, without retrying', async () => {
		spawnReturning(() =>
			emitting([
				assistantEvent({
					type: 'tool_use',
					id: 'tu-1',
					name: 'mcp__n8n-local__create_agent',
					input: { name: 'Clinic Assistant' },
				}),
				toolResultEvent(
					'tu-1',
					JSON.stringify({ ok: true, agent: { id: 'ag1', projectId: 'p1', published: false } }),
				),
				resultEvent({ result: 'Your Agent is ready.' }),
			]),
		);

		const result = await buildWorkflowViaMcp(buildOpts());

		expect(result.workflowId).toBeNull();
		expect(result.agent).toEqual({ id: 'ag1', projectId: 'p1' });
		expect(result.failureReason).toBeUndefined();
		expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
	});

	it('treats an existing Agent edited with mutate_agent as a build', async () => {
		spawnReturning(() =>
			emitting([
				assistantEvent({
					type: 'tool_use',
					id: 'tu-1',
					name: 'mcp__n8n-local__mutate_agent',
					input: { agentId: 'agSeed', operation: { type: 'task.upsert' } },
				}),
				toolResultEvent('tu-1', JSON.stringify({ ok: true, agentId: 'agSeed' })),
				resultEvent({ result: 'Added the daily task.' }),
			]),
		);

		const result = await buildWorkflowViaMcp(buildOpts());

		expect(result.agent).toEqual({ id: 'agSeed' });
		expect(result.failureReason).toBeUndefined();
		expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
	});

	it('records a failed tool call as an error, without taking its id', async () => {
		spawnReturning(() =>
			emitting([
				assistantEvent({
					type: 'tool_use',
					id: 'tu-1',
					name: 'mcp__n8n-local__create_workflow_from_code',
					input: {},
				}),
				toolResultEvent('tu-1', 'Validation failed', true),
				resultEvent({ result: 'Could not create it.' }),
			]),
		);

		const result = await buildWorkflowViaMcp({
			...buildOpts(),
			settings: { ...settings, maxAttempts: 1 },
		});

		expect(result.workflowId).toBeNull();
		expect(result.transcript[0]?.steps).toEqual([
			{
				kind: 'tool-call',
				toolName: 'create_workflow_from_code',
				toolCallId: 'tu-1',
				args: {},
				error: 'Validation failed',
			},
		]);
	});

	it('runs isolated without a build cwd: own config dir, empty cwd, Read of saved results only', async () => {
		spawnReturning(() => emitting([resultEvent({ result: 'WORKFLOW_ID=wf1' })]));

		await buildWorkflowViaMcp(buildOpts());

		const [, args, options] = spawnCall(0);
		expect(args).toEqual(expect.arrayContaining(['--output-format', 'stream-json', '--verbose']));
		const toolsIndex = args.indexOf('--tools');
		expect(args[toolsIndex + 1]).toBe('Read');
		expect(args).toEqual(expect.arrayContaining(['--permission-mode', 'dontAsk']));
		const configDir = String(options.env?.CLAUDE_CONFIG_DIR);
		expect(args).toContain(`Read(/${configDir}/**)`);
		expect(configDir).toContain('n8n-mcp-build-');
		expect(options.cwd).toContain('n8n-mcp-build-');
		expect(options.env?.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBe('1');
		expect(options.env?.CLAUDE_CODE_DISABLE_AUTO_MEMORY).toBe('1');
		// The throwaway home is removed once the attempt ends.
		expect(() => statSync(configDir)).toThrow();
	});

	it('keeps the host setup when a build cwd is given', async () => {
		spawnReturning(() => emitting([resultEvent({ result: 'WORKFLOW_ID=wf1' })]));

		await buildWorkflowViaMcp({ ...buildOpts(), settings: { ...settings, buildCwd: logDir } });

		const [, args, options] = spawnCall(0);
		expect(args).not.toContain('--tools');
		expect(options.cwd).toBe(logDir);
		expect(options.env?.CLAUDE_CONFIG_DIR).toBe(process.env.CLAUDE_CONFIG_DIR);
	});

	describe('with a simulated user', () => {
		const multiTurn = [user('Build a contact form'), user('[Ask for a Slack alert too]')];

		const makeDriver = (
			decisions: Array<{ kind: 'followUp'; message: string } | { kind: 'done' }>,
		) => {
			const recordAssistantMessage = vi.fn();
			const decideFollowUp = vi.fn(async () => decisions.shift() ?? { kind: 'done' as const });
			return { recordAssistantMessage, decideFollowUp };
		};

		it('sends only the first user turn, then resumes the session with each follow-up', async () => {
			let call = 0;
			spawnReturning(() => {
				call++;
				return call === 1
					? emitting([
							initEvent('sess-1'),
							assistantEvent({ type: 'text', text: 'Which channel?' }),
							resultEvent({ result: 'Which channel?', session_id: 'sess-1', total_cost_usd: 0.1 }),
						])
					: emitting([
							initEvent('sess-1'),
							assistantEvent({ type: 'text', text: 'Built.\nWORKFLOW_ID=wf9' }),
							// A resumed session reports its cumulative cost.
							resultEvent({ result: 'Built.\nWORKFLOW_ID=wf9', total_cost_usd: 0.3 }),
						]);
			});
			const driver = makeDriver([{ kind: 'followUp', message: 'Use #alerts' }]);

			const result = await buildWorkflowViaMcp({
				...buildOpts(),
				conversation: multiTurn,
				createDriver: () => driver,
			});

			expect(result.workflowId).toBe('wf9');
			expect(result.cost).toBeCloseTo(0.3);
			const [, firstArgs] = spawnCall(0);
			// The user's own words only: no later turns and no WORKFLOW_ID trailer.
			expect(firstArgs[1]).toBe('Build a contact form');
			expect(firstArgs).not.toContain('--resume');
			const [, secondArgs] = spawnCall(1);
			expect(secondArgs[1]).toBe('Use #alerts');
			expect(secondArgs).toEqual(expect.arrayContaining(['--resume', 'sess-1']));
			expect(driver.recordAssistantMessage).toHaveBeenNthCalledWith(1, 'Which channel?');
			expect(result.transcript.map((turn) => turn.userMessage)).toEqual([
				'Build a contact form',
				'Use #alerts',
			]);
		});

		it('builds the seeded workflow it edited with update_workflow', async () => {
			spawnReturning(() =>
				emitting([
					initEvent('sess-1'),
					assistantEvent({
						type: 'tool_use',
						id: 'tu-1',
						name: 'mcp__n8n-local__update_workflow',
						input: { workflowId: 'wfSeed', operations: [] },
					}),
					toolResultEvent('tu-1', JSON.stringify({ workflowId: 'wfSeed', nodeCount: 3 })),
					resultEvent({ result: 'Fixed the HTTP node.' }),
				]),
			);

			const result = await buildWorkflowViaMcp({
				...buildOpts(),
				createDriver: () => makeDriver([]),
			});

			expect(result.workflowId).toBe('wfSeed');
			expect(result.failureReason).toBeUndefined();
		});

		it('builds the seeded workflow when the conversation ends without saving one', async () => {
			spawnReturning(() =>
				emitting([initEvent('sess-1'), resultEvent({ result: 'The run failed on a timeout.' })]),
			);

			const result = await buildWorkflowViaMcp({
				...buildOpts(),
				createDriver: () => makeDriver([]),
				seededWorkflowIds: ['wfSeed', 'wfHelper'],
			});

			expect(result.workflowId).toBe('wfSeed');
			expect(result.failureReason).toBeUndefined();
			expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
		});

		it('does not count an update_workflow call that applied nothing as an edit', async () => {
			spawnReturning(() =>
				emitting([
					initEvent('sess-1'),
					assistantEvent({
						type: 'tool_use',
						id: 'tu-1',
						name: 'mcp__n8n-local__update_workflow',
						input: { workflowId: 'wfOther', operations: [] },
					}),
					toolResultEvent('tu-1', JSON.stringify({ workflowId: 'wfOther', appliedOperations: 0 })),
					resultEvent({ result: 'Nothing to change.' }),
				]),
			);

			const result = await buildWorkflowViaMcp({
				...buildOpts(),
				createDriver: () => makeDriver([]),
				seededWorkflowIds: ['wfSeed'],
			});

			expect(result.workflowId).toBe('wfSeed');
		});

		it('builds the seeded Agent when a finished conversation made or edited none', async () => {
			spawnReturning(() =>
				emitting([initEvent('sess-1'), resultEvent({ result: 'The Agent already does that.' })]),
			);

			const result = await buildWorkflowViaMcp({
				...buildOpts(),
				createDriver: () => makeDriver([]),
				seededAgentIds: ['agSeed'],
			});

			expect(result.agent).toEqual({ id: 'agSeed' });
			expect(result.failureReason).toBeUndefined();
		});

		it('does not fall back to seeded artifacts when the conversation did not finish', async () => {
			spawnReturning(() =>
				emitting([initEvent('sess-1'), resultEvent({ subtype: 'error_during_execution' })]),
			);

			const result = await buildWorkflowViaMcp({
				...buildOpts(),
				settings: { ...settings, maxAttempts: 1 },
				createDriver: () => makeDriver([]),
				seededWorkflowIds: ['wfSeed'],
				seededAgentIds: ['agSeed'],
			});

			expect(result.workflowId).toBeNull();
			expect(result.agent).toBeUndefined();
		});

		it('sends the seeded context before the opening message, and records only the note', async () => {
			spawnReturning(() => emitting([initEvent('sess-1'), resultEvent({ result: 'Done.' })]));

			const result = await buildWorkflowViaMcp({
				...buildOpts(),
				createDriver: () => makeDriver([]),
				openingMessagePrefix: 'EARLIER CONVERSATION',
				openingNote: '[attached workflow: Order sync]',
				openingMessageSuffix: '\n\nTABLES',
			});

			const [, args] = spawnCall(0);
			expect(args[1]).toBe(
				'EARLIER CONVERSATION\n\n[attached workflow: Order sync] Build a contact form\n\nTABLES',
			);
			expect(result.transcript[0]?.userMessage).toBe(
				'[attached workflow: Order sync] Build a contact form',
			);
		});

		it('ends the conversation at the build timeout when the simulated user hangs', async () => {
			spawnReturning(() =>
				emitting([initEvent('sess-1'), resultEvent({ result: 'Which channel?' })]),
			);
			const hungDriver = {
				recordAssistantMessage: vi.fn(),
				decideFollowUp: vi.fn(async () => await new Promise<never>(() => {})),
			};

			const result = await buildWorkflowViaMcp({
				...buildOpts(),
				settings: { ...settings, buildTimeoutMs: 50 },
				createDriver: () => hungDriver,
				seededWorkflowIds: ['wfSeed'],
			});

			expect(result.failureReason).toBe('timeout');
			// Recorded as a timeout, not as a builder failure, as on the Instance AI arm.
			expect(result.timeout).toEqual({ kind: 'conversation', turn: 2, elapsedMs: 50 });
			expect(result.finished).toBe(false);
			// An unfinished conversation does not fall back to the seeded workflow.
			expect(result.workflowId).toBeNull();
		});

		it('marks a workflow saved before the build timeout as timed out', async () => {
			spawnReturning(() =>
				emitting([
					initEvent('sess-1'),
					assistantEvent({
						type: 'tool_use',
						id: 'tu-1',
						name: 'mcp__n8n-local__create_workflow_from_code',
						input: {},
					}),
					toolResultEvent('tu-1', JSON.stringify({ workflowId: 'wfT' })),
					resultEvent({ result: 'Built it. Which channel?' }),
				]),
			);
			const hungDriver = {
				recordAssistantMessage: vi.fn(),
				decideFollowUp: vi.fn(async () => await new Promise<never>(() => {})),
			};

			const result = await buildWorkflowViaMcp({
				...buildOpts(),
				settings: { ...settings, buildTimeoutMs: 50 },
				createDriver: () => hungDriver,
			});

			// What was saved is graded, but the verdicts are kept out of the pass rate.
			expect(result.workflowId).toBe('wfT');
			expect(result.timeout).toEqual({ kind: 'conversation', turn: 2, elapsedMs: 50 });
		});

		it('does not retry a conversation that ended without a workflow', async () => {
			spawnReturning(() =>
				emitting([initEvent('sess-1'), resultEvent({ result: 'I need more details.' })]),
			);

			const result = await buildWorkflowViaMcp({
				...buildOpts(),
				conversation: multiTurn,
				createDriver: () => makeDriver([]),
			});

			expect(result.workflowId).toBeNull();
			expect(result.failureReason).toBe('no-workflow: I need more details.');
			expect(result.finished).toBe(true);
			expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
		});

		it('retries an unfinished conversation with a fresh simulated user', async () => {
			let call = 0;
			spawnReturning(() => {
				call++;
				return call === 1
					? emitting([initEvent('sess-1'), resultEvent({ subtype: 'error_during_execution' })])
					: emitting([initEvent('sess-2'), resultEvent({ result: 'WORKFLOW_ID=wf2' })]);
			});
			const createDriver = vi.fn(() => makeDriver([]));

			const result = await buildWorkflowViaMcp({
				...buildOpts(),
				conversation: multiTurn,
				createDriver,
			});

			expect(result.workflowId).toBe('wf2');
			expect(createDriver).toHaveBeenCalledTimes(2);
		});
	});
});

describe('isolatedClaudeAuthError', () => {
	beforeEach(() => {
		vi.stubEnv('ANTHROPIC_API_KEY', '');
		vi.stubEnv('ANTHROPIC_AUTH_TOKEN', '');
		vi.stubEnv('CLAUDE_CODE_OAUTH_TOKEN', '');
	});
	afterEach(() => vi.unstubAllEnvs());

	it('names the env vars an isolated build needs when none is set', () => {
		expect(isolatedClaudeAuthError(undefined)).toMatch(/ANTHROPIC_API_KEY/);
	});

	it('accepts a host setup through a build cwd, or any env token', () => {
		expect(isolatedClaudeAuthError('/tmp/x')).toBeUndefined();
		vi.stubEnv('CLAUDE_CODE_OAUTH_TOKEN', 'token');
		expect(isolatedClaudeAuthError(undefined)).toBeUndefined();
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
