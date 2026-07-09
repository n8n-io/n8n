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

	it.each<[string, Partial<WorkflowTestCase>]>([
		['credentials', { credentials: [{ type: 'slackApi' }] }],
		['seedFile', { seedFile: 'seeds/some-thread.seed.json' }],
		['priorConversation', { priorConversation: [user('We already agreed on #alerts')] }],
		['seedThread', { seedThread: { threadId: 't1' } }],
	])('flags %s', (field, overrides) => {
		expect(unsupportedMcpBuildSetupFields(testCase(overrides))).toEqual([field]);
	});

	it('flags multiple declared fields together', () => {
		expect(
			unsupportedMcpBuildSetupFields(
				testCase({
					credentials: [{ type: 'slackApi' }],
					priorConversation: [user('prelude')],
				}),
			),
		).toEqual(['credentials', 'priorConversation']);
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
				child.stdout.emit('data', Buffer.from('{"result":"built something, forgot the id"}'));
				child.emit('close', 0, null);
			});
			return child;
		});

		const result = await buildWorkflowViaMcp(buildOpts());

		expect(result.workflowId).toBeNull();
		expect(result.failureReason).toBe('no-stdout');
		expect(vi.mocked(spawn)).toHaveBeenCalledTimes(3);
	});

	it('returns the workflow id from a successful first attempt', async () => {
		spawnReturning(() => {
			const child = new FakeChild(1234);
			setImmediate(() => {
				child.stdout.emit(
					'data',
					Buffer.from(JSON.stringify({ result: 'done\nWORKFLOW_ID=wf123' })),
				);
				child.emit('close', 0, null);
			});
			return child;
		});

		const result = await buildWorkflowViaMcp(buildOpts());

		expect(result.workflowId).toBe('wf123');
		expect(result.failureReason).toBeUndefined();
		expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
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
