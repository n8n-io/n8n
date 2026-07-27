import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { buildWorkflowViaMcp, type McpBuildSettings } from '../cli/mcp-builder';

vi.mock('child_process', () => ({ spawn: vi.fn() }));

// Minimal ChildProcess double: EventEmitter + stdout/stderr streams + kill().
function makeFakeChild(opts: { dieOnKill?: boolean } = {}) {
	const child = new EventEmitter() as EventEmitter & {
		stdout: EventEmitter;
		stderr: EventEmitter;
		kill: ReturnType<typeof vi.fn>;
	};
	child.stdout = new EventEmitter();
	child.stderr = new EventEmitter();
	child.kill = vi.fn(() => {
		// A well-behaved process exits on SIGTERM; simulate that unless told otherwise.
		if (opts.dieOnKill !== false) setImmediate(() => child.emit('close', null));
		return true;
	});
	return child;
}

const baseSettings = (over: Partial<McpBuildSettings>): McpBuildSettings => ({
	serverName: 'n8n-local',
	model: 'claude-sonnet-4-6',
	maxAttempts: 3,
	mcpTimeoutMs: 1000,
	...over,
});

describe('buildWorkflowViaMcp — build timeout', () => {
	const logDir = mkdtempSync(join(tmpdir(), 'mcp-build-timeout-'));

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('kills a hung build at the timeout, reports it, and does NOT retry', async () => {
		// Child never emits close on its own → only the timeout can end it.
		const child = makeFakeChild();
		vi.mocked(spawn).mockReturnValue(child as unknown as ReturnType<typeof spawn>);

		const result = await buildWorkflowViaMcp({
			conversation: [{ role: 'user', text: 'build a contact form' }],
			slug: 'hang-case',
			iteration: 0,
			mcpConfigPath: '/tmp/does-not-need-to-exist.json',
			settings: baseSettings({ buildTimeoutMs: 30, maxAttempts: 3 }),
			logDir,
			log: () => {},
		});

		expect(result.workflowId).toBeNull();
		expect(result.failureReason).toBe('timeout');
		expect(child.kill).toHaveBeenCalledWith('SIGTERM');
		// maxAttempts is 3, but a timeout must not retry — exactly one spawn.
		expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
	});

	it('does not arm a killer when buildTimeoutMs is 0 (disabled)', async () => {
		const child = makeFakeChild();
		vi.mocked(spawn).mockReturnValue(child as unknown as ReturnType<typeof spawn>);
		// Emit a successful claude session so the build resolves normally.
		setImmediate(() => {
			child.stdout.emit(
				'data',
				Buffer.from(JSON.stringify({ result: 'created\nWORKFLOW_ID=W1', subtype: 'success' })),
			);
			child.emit('close', 0);
		});

		const result = await buildWorkflowViaMcp({
			conversation: [{ role: 'user', text: 'build something' }],
			slug: 'ok-case',
			iteration: 0,
			mcpConfigPath: '/tmp/does-not-need-to-exist.json',
			settings: baseSettings({ buildTimeoutMs: 0, maxAttempts: 1 }),
			logDir,
			log: () => {},
		});

		expect(result.workflowId).toBe('W1');
		expect(child.kill).not.toHaveBeenCalled();
	});
});
