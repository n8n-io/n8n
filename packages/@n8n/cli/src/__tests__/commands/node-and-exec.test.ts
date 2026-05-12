import type * as FsNs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type * as ClientNs from '../../client';
import CredentialList from '../../commands/credential/list';
import ExecRun from '../../commands/exec/run';
import NodeGet from '../../commands/node/get';
import NodeSearch from '../../commands/node/search';

// Mock the config module so commands don't try to read filesystem or env.
vi.mock('../../config', () => ({
	resolveConnection: vi.fn(() => ({
		url: 'http://localhost:5678',
		apiKey: 'test-key',
	})),
}));

// Mock the client module. We capture constructor args + method calls so each
// test can assert how the command wired flags/args into the HTTP layer.
//
// `vi.hoisted` keeps these references live across vitest's hoisting of the
// `vi.mock` factory above the top-level statements.
const clientMocks = vi.hoisted(() => ({
	constructorCalls: [] as unknown[],
	searchNodes: vi.fn(),
	getNode: vi.fn(),
	executeNode: vi.fn(),
	listCredentials: vi.fn(),
}));

vi.mock('../../client', async () => {
	const actual = await vi.importActual<typeof ClientNs>('../../client');
	class FakeN8nClient {
		constructor(opts: unknown) {
			clientMocks.constructorCalls.push(opts);
		}

		async searchNodes(...args: unknown[]): Promise<unknown> {
			return (await clientMocks.searchNodes(...args)) as unknown;
		}

		async getNode(...args: unknown[]): Promise<unknown> {
			return (await clientMocks.getNode(...args)) as unknown;
		}

		async executeNode(...args: unknown[]): Promise<unknown> {
			return (await clientMocks.executeNode(...args)) as unknown;
		}

		async listCredentials(...args: unknown[]): Promise<unknown> {
			return (await clientMocks.listCredentials(...args)) as unknown;
		}
	}
	// `BaseCommand.getClient` does `new N8nClient(...)`, so the export name
	// has to match. The constructor signature is duck-typed (commands never
	// `instanceof`-check, they only call methods).
	// eslint-disable-next-line @typescript-eslint/naming-convention
	return { ...actual, N8nClient: FakeN8nClient };
});

// Mock `node:fs` so the `exec run --input` tests can stub `readFileSync`
// without poking at the real filesystem. ESM module namespaces can't be
// monkey-patched after import, hence the top-level `vi.mock`.
const { readFileSyncMock } = vi.hoisted(() => ({ readFileSyncMock: vi.fn() }));
vi.mock('node:fs', async () => {
	const actual = await vi.importActual<typeof FsNs>('node:fs');
	return {
		...actual,
		// `default` ensures both `import * as fs from 'node:fs'` and
		// `import fs from 'node:fs'` receive our mock.
		default: { ...actual, readFileSync: readFileSyncMock },
		readFileSync: readFileSyncMock,
	};
});

// `oclif` needs to resolve the package root to load the config.
const pkgRoot = path.resolve(__dirname, '../../..');

/**
 * Capture everything the command writes to stdout. oclif's `this.log()`
 * routes through `ux.stdout`, which in `@oclif/core` ≥ 4 calls `console.log`
 * under the hood.
 */
function captureStdout(): { stop: () => string } {
	const chunks: string[] = [];
	const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
		chunks.push(args.map((a) => (typeof a === 'string' ? a : String(a))).join(' '));
	});
	return {
		stop() {
			spy.mockRestore();
			return chunks.join('\n');
		},
	};
}

beforeEach(() => {
	clientMocks.constructorCalls = [];
	clientMocks.searchNodes.mockReset();
	clientMocks.getNode.mockReset();
	clientMocks.executeNode.mockReset();
	clientMocks.listCredentials.mockReset();
	readFileSyncMock.mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────────
// node search
// ───────────────────────────────────────────────────────────────────────
describe('node search command', () => {
	it('forwards the query argument to client.searchNodes', async () => {
		clientMocks.searchNodes.mockResolvedValueOnce({
			results: [
				{
					nodeId: 'slack.message.send',
					displayName: 'Send Slack',
					description: 'Send a Slack message.',
				},
			],
		});
		const cap = captureStdout();

		await NodeSearch.run(['slack', '--json'], pkgRoot);

		const out = cap.stop();
		expect(clientMocks.searchNodes).toHaveBeenCalledWith('slack', undefined);
		expect(out).toContain('slack.message.send');
		expect(out).toContain('Send Slack');
	});

	it('forwards --has-credential as the second argument', async () => {
		clientMocks.searchNodes.mockResolvedValueOnce({ results: [] });
		const cap = captureStdout();

		await NodeSearch.run(['slack', '--has-credential', '--json'], pkgRoot);

		cap.stop();
		expect(clientMocks.searchNodes).toHaveBeenCalledWith('slack', true);
	});

	it('omits --has-credential when flag is absent (so server default applies)', async () => {
		clientMocks.searchNodes.mockResolvedValueOnce({ results: [] });
		const cap = captureStdout();

		await NodeSearch.run(['slack', '--json'], pkgRoot);

		cap.stop();
		// Should pass `undefined` rather than `false` so the server isn't asked
		// to filter to "no-credential" nodes.
		expect(clientMocks.searchNodes).toHaveBeenCalledWith('slack', undefined);
	});

	it('surfaces an error from the client', async () => {
		const { ApiError } = await import('../../client');
		clientMocks.searchNodes.mockRejectedValueOnce(new ApiError(500, 'boom'));
		const cap = captureStdout();

		await expect(NodeSearch.run(['slack', '--json'], pkgRoot)).rejects.toThrow(/boom/);
		cap.stop();
	});
});

// ───────────────────────────────────────────────────────────────────────
// node get
// ───────────────────────────────────────────────────────────────────────
describe('node get command', () => {
	it('forwards the id argument to client.getNode and prints the schema', async () => {
		clientMocks.getNode.mockResolvedValueOnce({
			nodeId: 'n8n-nodes-base.slack',
			displayName: 'Slack',
			operations: ['send', 'update'],
		});
		const cap = captureStdout();

		await NodeGet.run(['slack', '--json'], pkgRoot);

		const out = cap.stop();
		expect(clientMocks.getNode).toHaveBeenCalledWith('slack');
		expect(out).toContain('n8n-nodes-base.slack');
		expect(out).toContain('Slack');
		expect(out).toContain('send');
	});

	it('passes a fully-qualified id through unchanged', async () => {
		clientMocks.getNode.mockResolvedValueOnce({ nodeId: '@n8n/n8n-nodes-langchain.agent' });
		const cap = captureStdout();

		await NodeGet.run(['@n8n/n8n-nodes-langchain.agent', '--json'], pkgRoot);

		cap.stop();
		expect(clientMocks.getNode).toHaveBeenCalledWith('@n8n/n8n-nodes-langchain.agent');
	});

	it('surfaces a 404 error from the server', async () => {
		const { ApiError } = await import('../../client');
		clientMocks.getNode.mockRejectedValueOnce(
			new ApiError(404, 'Node not found', 'Resource not found. Verify the ID is correct.'),
		);
		const cap = captureStdout();

		await expect(NodeGet.run(['no-such-node', '--json'], pkgRoot)).rejects.toThrow(
			/Node not found/,
		);
		cap.stop();
	});
});

// ───────────────────────────────────────────────────────────────────────
// exec run
// ───────────────────────────────────────────────────────────────────────
describe('exec run command', () => {
	it('parses a single --param key=value into parameters', async () => {
		clientMocks.executeNode.mockResolvedValueOnce({ executionId: 'e1', status: 'success' });
		const cap = captureStdout();

		await ExecRun.run(['slack.message.send', '--param', 'channel=#test', '--json'], pkgRoot);

		cap.stop();
		expect(clientMocks.executeNode).toHaveBeenCalledTimes(1);
		const body = clientMocks.executeNode.mock.calls[0][0] as Record<string, unknown>;
		expect(body.nodeType).toBe('n8n-nodes-base.slack');
		expect(body.parameters).toEqual({
			resource: 'message',
			operation: 'send',
			channel: '#test',
		});
	});

	it('merges multiple --param flags into one parameters object', async () => {
		clientMocks.executeNode.mockResolvedValueOnce({ executionId: 'e1' });
		const cap = captureStdout();

		await ExecRun.run(
			['slack.message.send', '--param', 'channel=#test', '--param', 'text=hello', '--json'],
			pkgRoot,
		);

		cap.stop();
		const body = clientMocks.executeNode.mock.calls[0][0] as Record<string, unknown>;
		expect(body.parameters).toMatchObject({
			channel: '#test',
			text: 'hello',
			resource: 'message',
			operation: 'send',
		});
	});

	it('forwards --credential as credentialId', async () => {
		clientMocks.executeNode.mockResolvedValueOnce({ executionId: 'e1' });
		const cap = captureStdout();

		await ExecRun.run(['slack.message.send', '--credential', 'cred-123', '--json'], pkgRoot);

		cap.stop();
		const body = clientMocks.executeNode.mock.calls[0][0] as Record<string, unknown>;
		expect(body.credentialId).toBe('cred-123');
	});

	it('omits credentialId when --credential is absent', async () => {
		clientMocks.executeNode.mockResolvedValueOnce({ executionId: 'e1' });
		const cap = captureStdout();

		await ExecRun.run(['slack.message.send', '--json'], pkgRoot);

		cap.stop();
		const body = clientMocks.executeNode.mock.calls[0][0] as Record<string, unknown>;
		expect(body).not.toHaveProperty('credentialId');
	});

	it('forwards --dry-run as dryRun:true', async () => {
		clientMocks.executeNode.mockResolvedValueOnce({ status: 'dry-run' });
		const cap = captureStdout();

		await ExecRun.run(['slack.message.send', '--dry-run', '--json'], pkgRoot);

		cap.stop();
		const body = clientMocks.executeNode.mock.calls[0][0] as Record<string, unknown>;
		expect(body.dryRun).toBe(true);
	});

	it('omits dryRun when --dry-run is absent', async () => {
		clientMocks.executeNode.mockResolvedValueOnce({ status: 'success' });
		const cap = captureStdout();

		await ExecRun.run(['slack.message.send', '--json'], pkgRoot);

		cap.stop();
		const body = clientMocks.executeNode.mock.calls[0][0] as Record<string, unknown>;
		expect(body).not.toHaveProperty('dryRun');
	});

	it('always sets caller.kind=cli for telemetry', async () => {
		clientMocks.executeNode.mockResolvedValueOnce({});
		const cap = captureStdout();

		await ExecRun.run(['slack.message.send', '--json'], pkgRoot);

		cap.stop();
		const body = clientMocks.executeNode.mock.calls[0][0] as Record<string, unknown>;
		expect(body.caller).toEqual({ kind: 'cli', name: 'n8n-cli' });
	});

	it('reads --input from a JSON file (with @ prefix) and merges it into parameters', async () => {
		readFileSyncMock.mockReturnValueOnce(
			JSON.stringify({ channel: '#from-file', text: 'fromfile' }),
		);
		clientMocks.executeNode.mockResolvedValueOnce({});
		const cap = captureStdout();

		await ExecRun.run(['slack.message.send', '--input', '@payload.json', '--json'], pkgRoot);

		cap.stop();
		// The leading `@` should have been stripped before reading.
		expect(readFileSyncMock).toHaveBeenCalledWith('payload.json', 'utf-8');
		const body = clientMocks.executeNode.mock.calls[0][0] as Record<string, unknown>;
		expect(body.parameters).toMatchObject({ channel: '#from-file', text: 'fromfile' });
	});

	it('lets --param values override --input file values (later wins)', async () => {
		readFileSyncMock.mockReturnValueOnce(JSON.stringify({ channel: '#from-file' }));
		clientMocks.executeNode.mockResolvedValueOnce({});
		const cap = captureStdout();

		await ExecRun.run(
			['slack.message.send', '--input', 'payload.json', '--param', 'channel=#from-flag', '--json'],
			pkgRoot,
		);

		cap.stop();
		const body = clientMocks.executeNode.mock.calls[0][0] as Record<string, unknown>;
		expect((body.parameters as Record<string, unknown>).channel).toBe('#from-flag');
	});

	it('rejects --input files whose top-level JSON is not an object', async () => {
		readFileSyncMock.mockReturnValueOnce(JSON.stringify(['not', 'an', 'object']));
		const cap = captureStdout();

		await expect(
			ExecRun.run(['slack.message.send', '--input', 'arr.json', '--json'], pkgRoot),
		).rejects.toThrow(/JSON object/);
		cap.stop();
	});

	it('prints executionId from the response', async () => {
		clientMocks.executeNode.mockResolvedValueOnce({
			executionId: 'exec-42',
			status: 'success',
			executionUrl: 'http://localhost/exec/42',
		});
		const cap = captureStdout();

		await ExecRun.run(['slack.message.send', '--json'], pkgRoot);

		const out = cap.stop();
		expect(out).toContain('exec-42');
		expect(out).toContain('http://localhost/exec/42');
	});

	it('surfaces an error from executeNode', async () => {
		const { ApiError } = await import('../../client');
		clientMocks.executeNode.mockRejectedValueOnce(new ApiError(500, 'engine failed'));
		const cap = captureStdout();

		await expect(ExecRun.run(['slack.message.send', '--json'], pkgRoot)).rejects.toThrow(
			/engine failed/,
		);
		cap.stop();
	});
});

// ───────────────────────────────────────────────────────────────────────
// credential list (--node-type)
// ───────────────────────────────────────────────────────────────────────
describe('credential list command', () => {
	const sampleCredentials = [
		{ id: '1', name: 'My Slack', type: 'slackApi', createdAt: '2024-01-01' },
		{ id: '2', name: 'My Notion', type: 'notionApi', createdAt: '2024-01-02' },
		{ id: '3', name: 'Other Slack', type: 'slackApi', createdAt: '2024-01-03' },
	];

	it('returns all credentials when --node-type is not provided', async () => {
		clientMocks.listCredentials.mockResolvedValueOnce(sampleCredentials);
		const cap = captureStdout();

		await CredentialList.run(['--json'], pkgRoot);

		const out = cap.stop();
		expect(clientMocks.listCredentials).toHaveBeenCalledOnce();
		expect(out).toContain('My Slack');
		expect(out).toContain('My Notion');
		expect(out).toContain('Other Slack');
	});

	it('filters to the given type when --node-type is provided', async () => {
		clientMocks.listCredentials.mockResolvedValueOnce(sampleCredentials);
		const cap = captureStdout();

		await CredentialList.run(['--node-type', 'slackApi', '--json'], pkgRoot);

		const out = cap.stop();
		expect(out).toContain('My Slack');
		expect(out).toContain('Other Slack');
		expect(out).not.toContain('My Notion');
	});

	it('returns no results when the --node-type filter matches nothing', async () => {
		clientMocks.listCredentials.mockResolvedValueOnce(sampleCredentials);
		const cap = captureStdout();

		await CredentialList.run(['--node-type', 'no-such-type', '--json'], pkgRoot);

		const out = cap.stop();
		// JSON-mode empty array.
		expect(out.trim()).toContain('[]');
	});

	it('forwards --limit to the client', async () => {
		clientMocks.listCredentials.mockResolvedValueOnce([]);
		const cap = captureStdout();

		await CredentialList.run(['--limit', '5', '--json'], pkgRoot);

		cap.stop();
		expect(clientMocks.listCredentials).toHaveBeenCalledWith({}, 5);
	});
});
