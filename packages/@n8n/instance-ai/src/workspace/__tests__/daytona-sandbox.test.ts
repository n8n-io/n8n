import type { Mock } from 'vitest';

// Mock @daytonaio/sdk so we can drive sandbox creation, token refresh, and
// sandbox refetch behavior from Jest without touching the network.

interface MockSandbox {
	id: string;
	cpu: number;
	memory: number;
	target: string;
	state: string;
	process: { executeCommand: Mock };
	fs: Record<string, Mock>;
	start: Mock;
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
// consumed in source via `loadDaytona()` (which `require()`s @daytonaio/sdk), so
// we mock the first-party `lazy-daytona` module rather than the package itself.
const {
	clientLog,
	queuedGetErrors,
	queuedCreateResults,
	makeMockSandbox,
	Daytona,
	DaytonaError,
	DaytonaNotFoundError,
	resetDaytonaMockState,
} = vi.hoisted(() => {
	const clientLog: DaytonaClientLog[] = [];
	let nextClientId = 1;
	let nextSandboxId = 1;
	const queuedGetErrors: Error[] = [];
	const queuedCreateResults: Array<MockSandbox | Error> = [];

	function makeMockSandbox(id: string, state = 'started'): MockSandbox {
		return {
			id,
			cpu: 2,
			memory: 4,
			target: 'us',
			state,
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

	function resetDaytonaMockState(): void {
		clientLog.length = 0;
		nextClientId = 1;
		nextSandboxId = 1;
		queuedGetErrors.length = 0;
		queuedCreateResults.length = 0;
	}

	return {
		clientLog,
		queuedGetErrors,
		queuedCreateResults,
		makeMockSandbox,
		Daytona,
		DaytonaError,
		DaytonaNotFoundError,
		resetDaytonaMockState,
	};
});

vi.mock('../lazy-daytona', () => ({
	loadDaytona: () => ({ Daytona, DaytonaError, DaytonaNotFoundError }),
}));

import type { ErrorReporter, Logger } from '../../logger';
import { DaytonaSandbox } from '../daytona-sandbox';

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
	it('falls back from snapshot creation to image creation and preserves sandbox labels', async () => {
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
					'n8n-instance-ai-sandbox-id': 'sandbox-id',
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
					'n8n-instance-ai-sandbox-id': 'sandbox-id',
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

	it('executeCommand() propagates NotFound rather than NPE-ing on a silently-cleared cache', async () => {
		const sandbox = await startAndStageRemoteGone();
		await expect(sandbox.executeCommand('echo', ['hi'])).rejects.toThrow(/not found/i);
	});
});
