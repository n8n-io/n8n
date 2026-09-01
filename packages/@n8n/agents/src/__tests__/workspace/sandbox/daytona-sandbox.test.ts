import type { Mock } from 'vitest';

// Mock @daytona/sdk so we can drive sandbox creation, token refresh, and
// sandbox refetch behavior from Vitest without touching the network.

interface MockSandbox {
	id: string;
	cpu: number;
	memory: number;
	target: string;
	state: string;
	toolboxProxyUrl: string;
	process: { executeCommand: Mock };
	fs: Record<string, Mock>;
	start: Mock;
	waitUntilStarted: Mock;
	stop: Mock;
	delete: Mock;
	getWorkDir: Mock;
}

interface DaytonaClientLog {
	id: number;
	config: unknown;
	get: Mock<(...args: [string]) => Promise<MockSandbox>>;
	create: Mock<(...args: [unknown, unknown?]) => Promise<MockSandbox>>;
	delete: Mock;
}

// All mock state, helpers, and SDK classes live inside vi.hoisted so they are
// initialized before the (hoisted) module imports run. The Daytona SDK is
// consumed in source via `loadDaytona()` (which `require()`s @daytona/sdk), so
// we mock the first-party `lazy-daytona` module rather than the package itself.
const {
	clientLog,
	queuedGetErrors,
	queuedGetResults,
	queuedCreateResults,
	makeMockSandbox,
	Daytona,
	DaytonaConnectionError,
	DaytonaError,
	DaytonaNotFoundError,
	DaytonaTimeoutError,
	resetDaytonaMockState,
} = vi.hoisted(() => {
	const clientLog: DaytonaClientLog[] = [];
	let nextClientId = 1;
	let nextSandboxId = 1;
	const queuedGetErrors: Error[] = [];
	const queuedGetResults: MockSandbox[] = [];
	const queuedCreateResults: Array<MockSandbox | Error> = [];

	function makeMockSandbox(
		id: string,
		state = 'started',
		toolboxProxyUrl = 'https://proxy.example.test/v1/sandbox-proxy/toolbox/',
	): MockSandbox {
		return {
			id,
			cpu: 2,
			memory: 4,
			target: 'us',
			state,
			toolboxProxyUrl,
			process: {
				executeCommand: vi.fn().mockResolvedValue({
					exitCode: 0,
					artifacts: { stdout: 'ok' },
					result: 'ok',
				}),
			},
			fs: {
				downloadFile: vi.fn(),
				uploadFile: vi.fn(),
				deleteFile: vi.fn(),
				createFolder: vi.fn(),
				listFiles: vi.fn(),
				getFileDetails: vi.fn(),
				moveFiles: vi.fn(),
			},
			start: vi.fn().mockResolvedValue(undefined),
			waitUntilStarted: vi.fn().mockResolvedValue(undefined),
			stop: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn().mockResolvedValue(undefined),
			getWorkDir: vi.fn().mockResolvedValue('/home/daytona/workspace'),
		};
	}

	// Each client's get() returns a NEW sandbox object so the test can detect
	// refetch (i.e. .process / .fs identity changes after rotation).
	function makeDaytonaClientForLog(config: unknown): DaytonaClientLog {
		const id = nextClientId++;
		const get = vi
			.fn<(...args: [string]) => Promise<MockSandbox>>()
			.mockImplementation(async () => {
				const queued = queuedGetErrors.shift();
				if (queued !== undefined) {
					return await Promise.reject(queued);
				}
				const queuedResult = queuedGetResults.shift();
				if (queuedResult !== undefined) {
					return await Promise.resolve(queuedResult);
				}
				return await Promise.resolve(makeMockSandbox(`sb-${id}-${nextSandboxId++}`));
			});
		const create = vi
			.fn<(...args: [unknown, unknown?]) => Promise<MockSandbox>>()
			.mockImplementation(async () => {
				const queued = queuedCreateResults.shift();
				if (queued instanceof Error) {
					return await Promise.reject(queued);
				}
				if (queued) return await Promise.resolve(queued);
				return await Promise.resolve(makeMockSandbox(`sb-create-${id}-${nextSandboxId++}`));
			});
		const del = vi.fn().mockResolvedValue(undefined);
		const log: DaytonaClientLog = { id, config, get, create, delete: del };
		clientLog.push(log);
		return log;
	}

	class Daytona {
		private readonly log: DaytonaClientLog;
		constructor(config: unknown) {
			this.log = makeDaytonaClientForLog(config);
		}
		get get() {
			return this.log.get;
		}
		get create() {
			return this.log.create;
		}
		get delete() {
			return this.log.delete;
		}
	}
	class DaytonaError extends Error {
		statusCode?: number;
		constructor(message: string, statusCode?: number) {
			super(message);
			this.statusCode = statusCode;
		}
	}
	class DaytonaNotFoundError extends DaytonaError {
		constructor(message: string) {
			super(message, 404);
		}
	}
	class DaytonaConnectionError extends DaytonaError {}
	class DaytonaTimeoutError extends DaytonaError {}

	function resetDaytonaMockState(): void {
		clientLog.length = 0;
		nextClientId = 1;
		nextSandboxId = 1;
		queuedGetErrors.length = 0;
		queuedGetResults.length = 0;
		queuedCreateResults.length = 0;
	}

	return {
		clientLog,
		queuedGetErrors,
		queuedGetResults,
		queuedCreateResults,
		makeMockSandbox,
		Daytona,
		DaytonaConnectionError,
		DaytonaError,
		DaytonaNotFoundError,
		DaytonaTimeoutError,
		resetDaytonaMockState,
	};
});

vi.mock('../../../workspace/sandbox/lazy-daytona', () => ({
	loadDaytona: () => ({
		Daytona,
		DaytonaConnectionError,
		DaytonaError,
		DaytonaNotFoundError,
		DaytonaTimeoutError,
	}),
}));

import { DaytonaFilesystem } from '../../../workspace/filesystem/daytona-filesystem';
import { DaytonaSandbox } from '../../../workspace/sandbox/daytona-sandbox';
import type { ErrorReporter, Logger } from '../../../workspace/sandbox/logger';

function base64url(input: string): string {
	return Buffer.from(input, 'utf8').toString('base64url');
}
function makeJwt(expMs: number): string {
	const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const payload = base64url(JSON.stringify({ exp: Math.floor(expMs / 1000) }));
	return `${header}.${payload}.sig`;
}

function queueNotFound(message = 'sandbox not found'): void {
	queuedGetErrors.push(new DaytonaNotFoundError(message));
}

function makeLogger(): Logger {
	return {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	};
}

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const SKEW_MS = 5 * MINUTE_MS;

beforeEach(() => {
	resetDaytonaMockState();
});

describe('DaytonaSandbox (creation strategies)', () => {
	it('falls back from snapshot creation to image creation and preserves caller-provided labels', async () => {
		const logger = makeLogger();
		const errorReporter: ErrorReporter = { error: vi.fn() };
		const snapshotError = new Error('snapshot missing');
		queueNotFound('not found');
		queuedCreateResults.push(snapshotError, makeMockSandbox('remote-sandbox'));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			apiUrl: 'https://api.example.com',
			labels: {
				'n8n-builder': 'builder-run',
				run_id: 'run-1',
				thread_id: 'thread-1',
			},
			snapshot: 'n8n/instance-ai:1.123.0',
			image: 'node:20',
			ephemeral: true,
			logger,
			errorReporter,
			createStrategyMode: 'direct',
		});

		await sandbox.start();

		expect(clientLog[0].create).toHaveBeenCalledTimes(2);
		expect(clientLog[0].create.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				ephemeral: true,
				labels: {
					'n8n-builder': 'builder-run',
					run_id: 'run-1',
					thread_id: 'thread-1',
				},
				name: 'sandbox-name',
				snapshot: 'n8n/instance-ai:1.123.0',
			}),
		);
		expect(clientLog[0].create.mock.calls[1][0]).toEqual(
			expect.objectContaining({
				ephemeral: true,
				image: 'node:20',
				labels: {
					'n8n-builder': 'builder-run',
					run_id: 'run-1',
					thread_id: 'thread-1',
				},
				name: 'sandbox-name',
			}),
		);
		expect(logger.warn).toHaveBeenCalledWith(
			'Sandbox create from snapshot failed; falling back to image',
			expect.objectContaining({
				mode: 'direct',
				snapshotName: 'n8n/instance-ai:1.123.0',
			}),
		);
		expect(errorReporter.error).toHaveBeenCalledWith(
			snapshotError,
			expect.objectContaining({
				tags: {
					component: 'builder-sandbox-factory',
					mode: 'direct',
					strategy: 'snapshot',
				},
			}),
		);
	});

	it('reports image strategy failures and rethrows', async () => {
		const errorReporter: ErrorReporter = { error: vi.fn() };
		const imageError = new Error('image create failed');
		queueNotFound('not found');
		queuedCreateResults.push(imageError);

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			image: 'node:20',
			errorReporter,
			createStrategyMode: 'proxy',
		});

		await expect(sandbox.start()).rejects.toThrow('image create failed');
		expect(errorReporter.error).toHaveBeenCalledWith(
			imageError,
			expect.objectContaining({
				tags: {
					component: 'builder-sandbox-factory',
					mode: 'proxy',
					strategy: 'image',
				},
			}),
		);
	});

	it('reattaches to the existing sandbox when creation reports a name conflict', async () => {
		const logger = makeLogger();
		const errorReporter: ErrorReporter = { error: vi.fn() };
		queueNotFound('not found');
		queuedCreateResults.push(
			new DaytonaError('Sandbox with name sandbox-name already exists', 409),
		);
		queuedGetResults.push(makeMockSandbox('remote-existing'));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			logger,
			errorReporter,
		});

		await sandbox.start();

		expect(clientLog[0].create).toHaveBeenCalledTimes(1);
		expect(sandbox.getInfo().metadata?.remoteSandboxId).toBe('remote-existing');
		expect(errorReporter.error).not.toHaveBeenCalled();
		expect(logger.info).toHaveBeenCalledWith(
			'Sandbox name already exists; reattached to existing sandbox',
			expect.objectContaining({ sandboxName: 'sandbox-name', remoteSandboxId: 'remote-existing' }),
		);
	});

	it.each(['stopped', 'paused', 'archived'])(
		'resumes a %s sandbox after a name conflict',
		async (state) => {
			queueNotFound('not found');
			queuedCreateResults.push(new DaytonaError('Sandbox with name sandbox-name already exists'));
			const existing = makeMockSandbox(`remote-${state}`, state);
			queuedGetResults.push(existing);

			const sandbox = new DaytonaSandbox({
				id: 'sandbox-id',
				name: 'sandbox-name',
				apiKey: 'api-key',
				snapshot: 'n8n/instance-ai:1.123.0',
			});

			await sandbox.start();

			expect(existing.start).toHaveBeenCalled();
			expect(existing.waitUntilStarted).not.toHaveBeenCalled();
			expect(sandbox.getInfo().metadata?.remoteSandboxId).toBe(`remote-${state}`);
		},
	);

	it.each(['creating', 'restoring', 'starting', 'pending_build', 'pulling_snapshot'])(
		'waits for a %s sandbox after a concurrent create conflict',
		async (state) => {
			queueNotFound('not found');
			queuedCreateResults.push(
				new DaytonaError('Sandbox with name sandbox-name already exists', 409),
			);
			const existing = makeMockSandbox(`remote-${state}`, state);
			queuedGetResults.push(existing);

			const sandbox = new DaytonaSandbox({
				id: 'sandbox-id',
				name: 'sandbox-name',
				apiKey: 'api-key',
				snapshot: 'n8n/instance-ai:1.123.0',
			});

			await sandbox.start();

			expect(existing.waitUntilStarted).toHaveBeenCalled();
			expect(existing.start).not.toHaveBeenCalled();
			expect(sandbox.getInfo().metadata?.remoteSandboxId).toBe(`remote-${state}`);
		},
	);

	it('keeps polling until a long-running stop can be resumed after a name conflict', async () => {
		queueNotFound('not found');
		queuedCreateResults.push(
			new DaytonaError('Sandbox with name sandbox-name already exists', 409),
		);
		const stopping = makeMockSandbox('remote-transitioning', 'stopping');
		const stopped = makeMockSandbox('remote-transitioning', 'stopped');
		queuedGetResults.push(stopping, stopping, stopping, stopping, stopping, stopped);

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			createRetryBackoffBaseMs: 1,
		});

		await sandbox.start();

		expect(stopping.start).not.toHaveBeenCalled();
		expect(stopping.waitUntilStarted).not.toHaveBeenCalled();
		expect(stopped.start).toHaveBeenCalled();
		expect(clientLog[0].get).toHaveBeenCalledTimes(7);
	});

	it('keeps polling until a long-running pause can be resumed after a name conflict', async () => {
		queueNotFound('not found');
		queuedCreateResults.push(
			new DaytonaError('Sandbox with name sandbox-name already exists', 409),
		);
		const pausing = makeMockSandbox('remote-transitioning', 'pausing');
		const paused = makeMockSandbox('remote-transitioning', 'paused');
		queuedGetResults.push(pausing, pausing, pausing, pausing, pausing, paused);

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			createRetryBackoffBaseMs: 1,
		});

		await sandbox.start();

		expect(pausing.start).not.toHaveBeenCalled();
		expect(pausing.waitUntilStarted).not.toHaveBeenCalled();
		expect(paused.start).toHaveBeenCalled();
		expect(clientLog[0].get).toHaveBeenCalledTimes(7);
	});

	it('retries the lookup when a conflicted sandbox is not immediately visible', async () => {
		queueNotFound('not found');
		queuedCreateResults.push(
			new DaytonaError('Sandbox with name sandbox-name already exists', 409),
			new DaytonaError('Sandbox with name sandbox-name already exists', 409),
		);
		queueNotFound('not visible yet');
		queuedGetResults.push(makeMockSandbox('remote-eventually-visible'));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			createRetryBackoffBaseMs: 1,
		});

		await sandbox.start();

		expect(clientLog[0].get).toHaveBeenCalledTimes(3);
		expect(sandbox.getInfo().metadata?.remoteSandboxId).toBe('remote-eventually-visible');
	});

	it.each([
		['server error', new DaytonaError('Bad Gateway', 502)],
		['rate limit', new DaytonaError('Too Many Requests', 429)],
	])('recovers the initial lookup from a transient %s without creating', async (_kind, error) => {
		queuedGetErrors.push(error);
		queuedGetResults.push(makeMockSandbox('remote-recovered'));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			createRetryBackoffBaseMs: 1,
		});

		await sandbox.start();

		expect(clientLog[0].get).toHaveBeenCalledTimes(2);
		expect(clientLog[0].create).not.toHaveBeenCalled();
		expect(sandbox.getInfo().metadata?.remoteSandboxId).toBe('remote-recovered');
	});

	it('fails the initial lookup once transient retries are exhausted, without creating', async () => {
		queuedGetErrors.push(
			new DaytonaError('Bad Gateway', 502),
			new DaytonaError('Bad Gateway', 502),
			new DaytonaError('Bad Gateway', 502),
		);

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			createRetryBackoffBaseMs: 1,
		});

		await expect(sandbox.start()).rejects.toMatchObject({
			name: 'SandboxAcquisitionError',
			failureClass: 'DaytonaError:502',
			message: expect.stringContaining('Bad Gateway'),
		});
		expect(clientLog[0].get).toHaveBeenCalledTimes(3);
		expect(clientLog[0].create).not.toHaveBeenCalled();
	});

	it('recovers the lookup after a name conflict from a transient error', async () => {
		queueNotFound('not found');
		queuedCreateResults.push(
			new DaytonaError('Sandbox with name sandbox-name already exists', 409),
		);
		queuedGetErrors.push(new DaytonaError('Bad Gateway', 502));
		queuedGetResults.push(makeMockSandbox('remote-existing'));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			createRetryBackoffBaseMs: 1,
		});

		await sandbox.start();

		expect(clientLog[0].get).toHaveBeenCalledTimes(3);
		expect(clientLog[0].create).toHaveBeenCalledTimes(1);
		expect(sandbox.getInfo().metadata?.remoteSandboxId).toBe('remote-existing');
	});

	it('fails the lookup after a name conflict once transient retries are exhausted', async () => {
		queueNotFound('not found');
		queuedCreateResults.push(
			new DaytonaError('Sandbox with name sandbox-name already exists', 409),
		);
		queuedGetErrors.push(
			new DaytonaError('Bad Gateway', 502),
			new DaytonaError('Bad Gateway', 502),
			new DaytonaError('Bad Gateway', 502),
		);

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			createRetryBackoffBaseMs: 1,
		});

		await expect(sandbox.start()).rejects.toThrow('Bad Gateway');
		expect(clientLog[0].get).toHaveBeenCalledTimes(4);
		expect(clientLog[0].create).toHaveBeenCalledTimes(1);
	});

	it('deletes a dead sandbox before creating a replacement', async () => {
		const dead = makeMockSandbox('remote-dead', 'error');
		queuedGetResults.push(dead);
		queuedCreateResults.push(makeMockSandbox('remote-replacement'));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
		});

		await sandbox.start();

		expect(dead.delete).toHaveBeenCalled();
		expect(sandbox.getInfo().metadata?.remoteSandboxId).toBe('remote-replacement');
	});

	it('replaces a failed sandbox discovered after a name conflict', async () => {
		queueNotFound('not found');
		queuedCreateResults.push(
			new DaytonaError('Sandbox with name sandbox-name already exists', 409),
			makeMockSandbox('remote-replacement'),
		);
		const failed = makeMockSandbox('remote-failed', 'build_failed');
		failed.delete.mockImplementation(async () => {
			await Promise.resolve();
			queuedGetErrors.push(new DaytonaNotFoundError('deleted'));
		});
		queuedGetResults.push(failed);

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			createRetryBackoffBaseMs: 1,
		});

		await sandbox.start();

		expect(failed.delete).toHaveBeenCalled();
		expect(clientLog[0].create).toHaveBeenCalledTimes(2);
		expect(sandbox.getInfo().metadata?.remoteSandboxId).toBe('remote-replacement');
	});

	it.each([
		['server', new DaytonaError('Bad Gateway', 502)],
		['rate-limit', new DaytonaError('Too Many Requests', 429)],
		['connection', new DaytonaConnectionError('socket hang up')],
		['timeout', new DaytonaTimeoutError('request timed out')],
	])('retries a transient %s create failure', async (_kind, error) => {
		queueNotFound('not found');
		queuedCreateResults.push(error, makeMockSandbox('remote-after-retry'));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			createRetryBackoffBaseMs: 1,
		});

		await sandbox.start();

		expect(clientLog[0].create).toHaveBeenCalledTimes(2);
		expect(sandbox.getInfo().metadata?.remoteSandboxId).toBe('remote-after-retry');
	});

	it('fails once transient create retries are exhausted', async () => {
		queueNotFound('not found');
		queuedCreateResults.push(
			new DaytonaError('Bad Gateway', 502),
			new DaytonaError('Bad Gateway', 502),
			new DaytonaError('Bad Gateway', 502),
		);

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			createRetryBackoffBaseMs: 1,
		});

		await expect(sandbox.start()).rejects.toMatchObject({
			name: 'SandboxAcquisitionError',
			failureClass: 'DaytonaError:502',
		});
		expect(clientLog[0].create).toHaveBeenCalledTimes(3);
	});

	it('does not retry non-transient create failures', async () => {
		queueNotFound('not found');
		queuedCreateResults.push(new DaytonaError('Forbidden', 403));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			createRetryBackoffBaseMs: 1,
		});

		await expect(sandbox.start()).rejects.toThrow('Forbidden');
		expect(clientLog[0].create).toHaveBeenCalledTimes(1);
	});

	it('does not treat an unrelated already-exists message as a sandbox name conflict', async () => {
		const errorReporter: ErrorReporter = { error: vi.fn() };
		const snapshotError = new DaytonaError('Snapshot build failed: file already exists');
		queueNotFound('not found');
		queuedCreateResults.push(snapshotError, makeMockSandbox('remote-from-image'));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			image: 'node:20',
			errorReporter,
		});

		await sandbox.start();

		expect(clientLog[0].create).toHaveBeenCalledTimes(2);
		expect(sandbox.getInfo().metadata?.remoteSandboxId).toBe('remote-from-image');
		expect(errorReporter.error).toHaveBeenCalledWith(
			snapshotError,
			expect.objectContaining({
				tags: expect.objectContaining({ strategy: 'snapshot' }),
			}),
		);
	});

	it('retries creation when a conflicted sandbox disappears before it becomes visible', async () => {
		queueNotFound('not found');
		queuedCreateResults.push(
			new DaytonaError('Sandbox with name sandbox-name already exists', 409),
			makeMockSandbox('remote-replacement'),
		);
		queueNotFound('gone before reattach');

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			image: 'node:20',
			createRetryBackoffBaseMs: 1,
		});

		await sandbox.start();

		expect(clientLog[0].create).toHaveBeenCalledTimes(2);
		expect(sandbox.getInfo().metadata?.remoteSandboxId).toBe('remote-replacement');
	});

	it('deletes a sandbox stuck provisioning and creates a fresh one', async () => {
		const logger = makeLogger();
		const wedged = makeMockSandbox('remote-wedged', 'building_snapshot');
		wedged.waitUntilStarted.mockRejectedValue(
			new DaytonaTimeoutError('Sandbox failed to become ready within the timeout period'),
		);
		queuedGetResults.push(wedged);
		queuedCreateResults.push(makeMockSandbox('remote-fresh'));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			timeout: 200_000,
			logger,
		});

		await sandbox.start();

		// The wait gets half the remaining acquisition budget, not all of it.
		const waitSeconds = wedged.waitUntilStarted.mock.calls[0][0] as number;
		expect(waitSeconds).toBeLessThanOrEqual(100);
		expect(waitSeconds).toBeGreaterThanOrEqual(60);
		expect(wedged.delete).toHaveBeenCalled();
		expect(sandbox.getInfo().metadata?.remoteSandboxId).toBe('remote-fresh');
		expect(logger.warn).toHaveBeenCalledWith(
			'Daytona sandbox is stuck in a transitional state; deleting it so a fresh one can be created',
			expect.objectContaining({ sandboxName: 'sandbox-name', state: 'building_snapshot' }),
		);
	});

	it.each(['restoring', 'starting', 'resizing'])(
		'keeps a %s sandbox whose wait times out and fails with a classified error',
		async (state) => {
			const stateful = makeMockSandbox(`remote-${state}`, state);
			stateful.waitUntilStarted.mockRejectedValue(new DaytonaTimeoutError('never became ready'));
			queuedGetResults.push(stateful);

			const sandbox = new DaytonaSandbox({
				id: 'sandbox-id',
				name: 'sandbox-name',
				apiKey: 'api-key',
				snapshot: 'n8n/instance-ai:1.123.0',
			});

			await expect(sandbox.start()).rejects.toMatchObject({
				name: 'SandboxNotReadyError',
				failureClass: 'sandbox-not-ready',
			});
			expect(stateful.delete).not.toHaveBeenCalled();
			expect(clientLog[0].create).not.toHaveBeenCalled();
		},
	);

	it('keeps a stopped sandbox whose resume times out and fails with a classified error', async () => {
		const stopped = makeMockSandbox('remote-stopped', 'stopped');
		stopped.start.mockRejectedValue(new DaytonaTimeoutError('resume timed out'));
		queuedGetResults.push(stopped);

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
		});

		await expect(sandbox.start()).rejects.toMatchObject({ name: 'SandboxNotReadyError' });
		expect(stopped.delete).not.toHaveBeenCalled();
		expect(clientLog[0].create).not.toHaveBeenCalled();
	});

	it('caps the create timeout at the remaining acquisition budget', async () => {
		queueNotFound('not found');
		queuedCreateResults.push(makeMockSandbox('remote-created'));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			timeout: 100_000,
			createTimeoutSeconds: 300,
		});

		await sandbox.start();

		const createOptions = clientLog[0].create.mock.calls[0][1] as { timeout: number };
		expect(createOptions.timeout).toBeLessThanOrEqual(100);
		expect(createOptions.timeout).toBeGreaterThan(90);
	});

	it('fails fast with a distinct error when the conflicting sandbox is never visible', async () => {
		queueNotFound('not found');
		queuedCreateResults.push(
			new DaytonaError('Sandbox with name sandbox-name already exists', 409),
			new DaytonaError('Sandbox with name sandbox-name already exists', 409),
			new DaytonaError('Sandbox with name sandbox-name already exists', 409),
		);
		queueNotFound('invisible');
		queueNotFound('invisible');
		queueNotFound('invisible');

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			createRetryBackoffBaseMs: 1,
		});

		await expect(sandbox.start()).rejects.toMatchObject({
			name: 'SandboxNameConflictError',
			failureClass: 'unresolved-name-conflict',
		});
		expect(clientLog[0].create).toHaveBeenCalledTimes(3);
	});
});

describe('DaytonaSandbox (destroy ownership)', () => {
	it('does not delete a sandbox by name when start() never acquired one', async () => {
		queuedGetErrors.push(
			new DaytonaError('Bad Gateway', 502),
			new DaytonaError('Bad Gateway', 502),
			new DaytonaError('Bad Gateway', 502),
		);

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
			createRetryBackoffBaseMs: 1,
		});

		await expect(sandbox.start()).rejects.toThrow('Bad Gateway');
		const getCallsAfterStart = clientLog[0].get.mock.calls.length;

		await expect(sandbox.destroy()).resolves.toBeUndefined();

		// No by-name resolve (and thus no delete) for a remote this instance never acquired.
		expect(clientLog[0].get).toHaveBeenCalledTimes(getCallsAfterStart);
	});

	it('destroy() after stop() still deletes the acquired remote by name', async () => {
		queueNotFound('not found');
		queuedCreateResults.push(makeMockSandbox('remote-created'));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			snapshot: 'n8n/instance-ai:1.123.0',
		});

		await sandbox.start();
		await sandbox.stop();

		const byName = makeMockSandbox('remote-created');
		queuedGetResults.push(byName);
		await sandbox.destroy();

		expect(byName.delete).toHaveBeenCalled();
	});

	it('deleteRemote() deletes by name even when this instance never started the sandbox', async () => {
		const foreign = makeMockSandbox('remote-foreign');
		queuedGetResults.push(foreign);

		const sandbox = new DaytonaSandbox({ name: 'sandbox-name', apiKey: 'api-key' });
		await sandbox.deleteRemote();

		expect(clientLog[0].get).toHaveBeenCalledWith('sandbox-name');
		expect(foreign.delete).toHaveBeenCalled();
	});
});

describe('DaytonaSandbox (direct mode)', () => {
	it('instantiates one Daytona client and never calls getAuthToken', async () => {
		const sandbox = new DaytonaSandbox({
			id: 'thread-1',
			name: 'thread-1',
			apiKey: 'static-key',
		});

		await sandbox.start();
		await sandbox.executeCommand('echo', ['hi']);
		await sandbox.executeCommand('echo', ['bye']);

		expect(clientLog).toHaveLength(1);
		expect(clientLog[0].config).toEqual({ apiKey: 'static-key' });
	});
});

describe('DaytonaSandbox (proxy mode - JWT refresh)', () => {
	it('mints a Daytona client only when the sandbox is first touched', () => {
		const getAuthToken = vi.fn().mockResolvedValue(makeJwt(Date.now() + HOUR_MS));
		new DaytonaSandbox({ name: 'thread-1', getAuthToken });

		expect(getAuthToken).not.toHaveBeenCalled();
		expect(clientLog).toHaveLength(0);
	});

	it('reuses the same Daytona client across calls within the TTL window', async () => {
		const getAuthToken = vi.fn().mockResolvedValue(makeJwt(Date.now() + HOUR_MS));
		const sandbox = new DaytonaSandbox({ name: 'thread-1', getAuthToken });

		await sandbox.start();
		await sandbox.executeCommand('echo', ['hi']);
		await sandbox.executeCommand('echo', ['bye']);

		expect(getAuthToken).toHaveBeenCalledTimes(1);
		expect(clientLog).toHaveLength(1);
	});

	it('refetches the Sandbox via client.get() after the JWT rotates', async () => {
		vi.useFakeTimers().setSystemTime(new Date(1_700_000_000_000));
		try {
			const getAuthToken = vi
				.fn<(...args: []) => Promise<string>>()
				.mockImplementation(async () => {
					await Promise.resolve();
					return makeJwt(Date.now() + HOUR_MS);
				});
			const sandbox = new DaytonaSandbox({ name: 'thread-1', getAuthToken });

			await sandbox.start();
			const firstProcess = sandbox.instance.process;
			expect(getAuthToken).toHaveBeenCalledTimes(1);
			expect(clientLog).toHaveLength(1);

			// Advance into the skew window.
			vi.setSystemTime(new Date(Date.now() + HOUR_MS - SKEW_MS + 1));

			await sandbox.executeCommand('echo', ['after-refresh']);

			// New JWT minted, new Daytona client, sandbox refetched via client.get.
			expect(getAuthToken).toHaveBeenCalledTimes(2);
			expect(clientLog).toHaveLength(2);
			expect(clientLog[1].get).toHaveBeenCalledWith('thread-1');

			// `.process` is bound to the new client, so identity differs from before refresh.
			expect(sandbox.instance.process).not.toBe(firstProcess);
			expect(sandbox.instance.process.executeCommand).toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});

	it('refreshes on ensureAuthFresh() before fs operations', async () => {
		vi.useFakeTimers().setSystemTime(new Date(1_700_000_000_000));
		try {
			const getAuthToken = vi
				.fn<(...args: []) => Promise<string>>()
				.mockImplementation(async () => {
					await Promise.resolve();
					return makeJwt(Date.now() + HOUR_MS);
				});
			const sandbox = new DaytonaSandbox({ name: 'thread-1', getAuthToken });

			await sandbox.start();
			expect(getAuthToken).toHaveBeenCalledTimes(1);

			vi.setSystemTime(new Date(Date.now() + HOUR_MS - SKEW_MS + 1));
			await sandbox.ensureAuthFresh();

			expect(getAuthToken).toHaveBeenCalledTimes(2);
			expect(clientLog).toHaveLength(2);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('DaytonaSandbox (remote sandbox gone during refetch)', () => {
	// Common setup: start a sandbox in proxy mode, advance into the refresh skew
	// window, pre-arm the next Daytona client's get() to throw NotFound. The next
	// call into the sandbox triggers a token rotation; the refetch then surfaces
	// the remote-gone condition.
	async function startAndStageRemoteGone() {
		vi.useFakeTimers().setSystemTime(new Date(1_700_000_000_000));
		const getAuthToken = vi.fn<(...args: []) => Promise<string>>().mockImplementation(async () => {
			await Promise.resolve();
			return makeJwt(Date.now() + HOUR_MS);
		});
		const sandbox = new DaytonaSandbox({ name: 'thread-1', getAuthToken });

		await sandbox.start();
		vi.setSystemTime(new Date(Date.now() + HOUR_MS - SKEW_MS + 1));
		queueNotFound();

		return sandbox;
	}

	afterEach(() => {
		vi.useRealTimers();
	});

	it('stop() treats remote NotFound as idempotent and clears the cache', async () => {
		const sandbox = await startAndStageRemoteGone();

		await expect(sandbox.stop()).resolves.toBeUndefined();
		// Subsequent stop() is a no-op since cache is cleared.
		await expect(sandbox.stop()).resolves.toBeUndefined();
	});

	it('destroy() treats remote NotFound as idempotent and clears the cache', async () => {
		const sandbox = await startAndStageRemoteGone();

		await expect(sandbox.destroy()).resolves.toBeUndefined();
		// Second destroy goes through the no cached sandbox branch. Need a fresh
		// queued error since the previous one was consumed.
		queueNotFound();
		await expect(sandbox.destroy()).resolves.toBeUndefined();
	});

	it('executeCommand() recovers by recreating the sandbox when the remote was deleted', async () => {
		const sandbox = await startAndStageRemoteGone();
		// The remote stays gone: the recovery's findExistingSandbox() lookup also 404s, so
		// it falls through to creating a fresh sandbox.
		queueNotFound();

		// The staged refetch throws NotFound (a 404 short-circuits as recoverable); recovery
		// resets the handle and re-runs start() → findExistingSandbox() → create.
		const result = await sandbox.executeCommand('echo', ['hi']);

		expect(result.success).toBe(true);
		expect(result.stdout).toBe('ok');
		expect(clientLog.some((c) => c.create.mock.calls.length > 0)).toBe(true);
	});

	it('executeCommand() recovers a stopped remote from its state, even on a 403', async () => {
		// Direct mode (static key) — no JWT rotation, so recovery cannot rely on the
		// getDaytona refetch; it must come from the state probe in recoverAndRetry.
		const failing = makeMockSandbox('sb-stale', 'started');
		// A stopped/unreachable container surfaces as "Endpoint not allowed; 403" (which also
		// looks like an auth error). Recovery must be driven by the probed remote state, not
		// by the error code — otherwise this 403 is misread as auth and never recovers.
		failing.process.executeCommand = vi
			.fn()
			.mockRejectedValue(new DaytonaError('Endpoint not allowed', 403));
		const probeStopped = makeMockSandbox('sb-probe', 'stopped');
		const resumed = makeMockSandbox('sb-resumed', 'stopped');
		// get order: start() → failing; isRecoverable probe → stopped; retry start() → resumed.
		queuedGetResults.push(failing, probeStopped, resumed);

		const sandbox = new DaytonaSandbox({ name: 'thread-1', apiKey: 'key' });
		const result = await sandbox.executeCommand('echo', ['resumed']);

		expect(result.success).toBe(true);
		expect(resumed.start).toHaveBeenCalled();
	});

	it('executeCommand() does not recover when auth is genuinely failing', async () => {
		vi.useFakeTimers().setSystemTime(new Date(1_700_000_000_000));
		const getAuthToken = vi.fn<(...args: []) => Promise<string>>().mockImplementation(async () => {
			await Promise.resolve();
			return makeJwt(Date.now() + HOUR_MS);
		});
		const sandbox = new DaytonaSandbox({ name: 'thread-1', getAuthToken });
		await sandbox.start();

		vi.setSystemTime(new Date(Date.now() + HOUR_MS - SKEW_MS + 1));
		// Both the op's refetch and the recovery probe fail auth — the probe can't confirm a
		// not-running state, so the original error propagates and nothing is recreated.
		queuedGetErrors.push(
			new DaytonaError('unauthorized', 401),
			new DaytonaError('unauthorized', 401),
		);

		await expect(sandbox.executeCommand('echo', ['hi'])).rejects.toThrow(/unauthorized/i);
		expect(clientLog.every((c) => c.create.mock.calls.length === 0)).toBe(true);
	});

	it('executeCommand() propagates when the remote is still running (no false recovery)', async () => {
		// op fails but the probe finds the sandbox healthy → original error must surface.
		const healthy = makeMockSandbox('sb-healthy', 'started');
		healthy.process.executeCommand = vi
			.fn()
			.mockRejectedValue(new Error('genuine command failure'));
		const probeStarted = makeMockSandbox('sb-probe', 'started');
		queuedGetResults.push(healthy, probeStarted);

		const sandbox = new DaytonaSandbox({ name: 'thread-1', apiKey: 'key' });

		await expect(sandbox.executeCommand('echo', ['hi'])).rejects.toThrow(
			/genuine command failure/i,
		);
		expect(clientLog.every((c) => c.create.mock.calls.length === 0)).toBe(true);
	});

	it('executeCommand() does not recover from a failed (error) state', async () => {
		// A non-running but non-recoverable state (error/build_failed/transient) must not
		// trigger a resume/recreate — only stopped/archived/gone are recoverable.
		const failing = makeMockSandbox('sb-stale', 'started');
		failing.process.executeCommand = vi.fn().mockRejectedValue(new Error('boom'));
		const probeError = makeMockSandbox('sb-probe', 'error');
		queuedGetResults.push(failing, probeError);

		const sandbox = new DaytonaSandbox({ name: 'thread-1', apiKey: 'key' });

		await expect(sandbox.executeCommand('echo', ['hi'])).rejects.toThrow(/boom/i);
		expect(clientLog.every((c) => c.create.mock.calls.length === 0)).toBe(true);
	});

	it('executeCommand() retries recovery at most once', async () => {
		const sandbox = await startAndStageRemoteGone();

		// The recovery retry also fails: findExistingSandbox() get → NotFound (→ create) and
		// the create rejects. The second failure propagates instead of looping.
		queueNotFound();
		queuedCreateResults.push(new Error('create failed'));

		await expect(sandbox.executeCommand('echo', ['hi'])).rejects.toThrow(/create failed/i);
	});

	it('executeCommand() rejects without starting work when already aborted', async () => {
		const sandbox = new DaytonaSandbox({ name: 'thread-1', apiKey: 'key' });
		const controller = new AbortController();
		controller.abort();

		await expect(
			sandbox.executeCommand('echo', ['hi'], { abortSignal: controller.signal }),
		).rejects.toMatchObject({ name: 'AbortError' });
		expect(clientLog).toHaveLength(0);
	});

	it('executeCommand() does not recover from AbortError', async () => {
		const failing = makeMockSandbox('sb-abort', 'started');
		const abortError = new Error('This operation was aborted');
		abortError.name = 'AbortError';
		failing.process.executeCommand = vi.fn().mockRejectedValue(abortError);
		queuedGetResults.push(failing);

		const sandbox = new DaytonaSandbox({ name: 'thread-1', apiKey: 'key' });

		await expect(sandbox.executeCommand('echo', ['hi'])).rejects.toMatchObject({
			name: 'AbortError',
		});
		expect(clientLog.every((c) => c.create.mock.calls.length === 0)).toBe(true);
		// Only the initial start get — no isRecoverable probe get after AbortError.
		expect(clientLog.reduce((n, c) => n + c.get.mock.calls.length, 0)).toBe(1);
	});

	it('DaytonaFilesystem reuses the same recovery when the remote was deleted', async () => {
		const sandbox = await startAndStageRemoteGone();
		// findExistingSandbox() lookup also 404s during recovery → create a fresh sandbox.
		queueNotFound();
		const filesystem = new DaytonaFilesystem(sandbox);

		// readFile() → withFilesystem() → recoverAndRetry: the staged NotFound triggers a
		// reset + recreate, then the op runs against the fresh fs handle.
		await expect(filesystem.readFile('/workspace/file.txt')).resolves.toBeUndefined();
		expect(clientLog.some((c) => c.create.mock.calls.length > 0)).toBe(true);
	});

	it('DaytonaFilesystem.exists() recovers a stopped sandbox instead of reporting missing', async () => {
		// getFileDetails on a stopped sandbox fails with a non-404 — it must bubble to
		// recovery, not be swallowed as "file does not exist".
		const failing = makeMockSandbox('sb-stale', 'started');
		failing.fs.getFileDetails = vi
			.fn()
			.mockRejectedValue(new DaytonaError('Endpoint not allowed', 403));
		const probeStopped = makeMockSandbox('sb-probe', 'stopped');
		const resumed = makeMockSandbox('sb-resumed', 'stopped');
		queuedGetResults.push(failing, probeStopped, resumed);

		const sandbox = new DaytonaSandbox({ name: 'thread-1', apiKey: 'key' });
		const filesystem = new DaytonaFilesystem(sandbox);

		await expect(filesystem.exists('/workspace/marker')).resolves.toBe(true);
		expect(resumed.start).toHaveBeenCalled();
	});

	it('DaytonaFilesystem.exists() returns false for a genuine 404 without recovering', async () => {
		const handle = makeMockSandbox('sb-1', 'started');
		handle.fs.getFileDetails = vi.fn().mockRejectedValue(new DaytonaError('file not found', 404));
		queuedGetResults.push(handle);

		const sandbox = new DaytonaSandbox({ name: 'thread-1', apiKey: 'key' });
		const filesystem = new DaytonaFilesystem(sandbox);

		await expect(filesystem.exists('/workspace/missing')).resolves.toBe(false);
		expect(clientLog.every((c) => c.create.mock.calls.length === 0)).toBe(true);
	});

	it('DaytonaFilesystem.appendFile() treats a genuine 404 as an empty file', async () => {
		const handle = makeMockSandbox('sb-1', 'started');
		handle.fs.downloadFile = vi.fn().mockRejectedValue(new DaytonaError('file not found', 404));
		queuedGetResults.push(handle);

		const sandbox = new DaytonaSandbox({ name: 'thread-1', apiKey: 'key' });
		const filesystem = new DaytonaFilesystem(sandbox);

		await filesystem.appendFile('/workspace/log.txt', 'entry');
		expect(handle.fs.uploadFile).toHaveBeenCalled();
	});
});

describe('DaytonaSandbox (stale toolbox URL recovery)', () => {
	const PROXY_URL = 'https://proxy.example.test/v1/sandbox-proxy/toolbox/';
	const PROVIDER_URL = 'https://proxy.app-eu.provider.test/toolbox';

	function unauthorized() {
		return new DaytonaError('unauthorized: authentication failed', 401);
	}

	// A resumed sandbox can arrive holding the provider's own toolbox URL. The SDK binds its
	// toolbox client to that URL and keeps it, so every later call is rejected until the handle
	// is replaced.
	it('adopts the refetched sandbox and replays the command once', async () => {
		const stale = makeMockSandbox('remote-stale', 'started', PROVIDER_URL);
		stale.process.executeCommand
			.mockRejectedValueOnce(unauthorized())
			.mockResolvedValue({ exitCode: 0, artifacts: { stdout: 'ok' }, result: 'ok' });
		queuedGetResults.push(stale, makeMockSandbox('remote-fresh', 'started', PROXY_URL));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			createRetryBackoffBaseMs: 1,
		});
		await sandbox.start();

		const result = await sandbox.executeCommand('echo hi');

		expect(result.exitCode).toBe(0);
		expect(sandbox.getInfo().metadata?.remoteSandboxId).toBe('remote-fresh');
	});

	it('propagates the failure when the refetched toolbox URL is unchanged', async () => {
		const handle = makeMockSandbox('remote-only', 'started', PROXY_URL);
		handle.process.executeCommand.mockRejectedValue(unauthorized());
		queuedGetResults.push(handle, makeMockSandbox('remote-probe', 'started', PROXY_URL));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			createRetryBackoffBaseMs: 1,
		});
		await sandbox.start();

		await expect(sandbox.executeCommand('echo hi')).rejects.toThrow('unauthorized');
		expect(handle.process.executeCommand).toHaveBeenCalledTimes(1);
	});

	it('does not replace the handle for a non-auth failure', async () => {
		const handle = makeMockSandbox('remote-only', 'started', PROVIDER_URL);
		handle.process.executeCommand.mockRejectedValue(new DaytonaError('Bad Request', 400));
		queuedGetResults.push(handle, makeMockSandbox('remote-probe', 'started', PROXY_URL));

		const sandbox = new DaytonaSandbox({
			id: 'sandbox-id',
			name: 'sandbox-name',
			apiKey: 'api-key',
			createRetryBackoffBaseMs: 1,
		});
		await sandbox.start();

		await expect(sandbox.executeCommand('echo hi')).rejects.toThrow('Bad Request');
		expect(sandbox.getInfo().metadata?.remoteSandboxId).toBe('remote-only');
	});
});
