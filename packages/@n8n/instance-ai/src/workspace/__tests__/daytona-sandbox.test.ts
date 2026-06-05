// Mock @daytonaio/sdk so we can drive sandbox creation, token refresh, and
// sandbox refetch behavior from Jest without touching the network.

interface MockSandbox {
	id: string;
	cpu: number;
	memory: number;
	target: string;
	state: string;
	process: { executeCommand: jest.Mock };
	fs: Record<string, jest.Mock>;
	start: jest.Mock;
	stop: jest.Mock;
	delete: jest.Mock;
	getWorkDir: jest.Mock;
}

function makeMockSandbox(id: string, state = 'started'): MockSandbox {
	return {
		id,
		cpu: 2,
		memory: 4,
		target: 'us',
		state,
		process: {
			executeCommand: jest.fn().mockResolvedValue({
				exitCode: 0,
				artifacts: { stdout: 'ok' },
				result: 'ok',
			}),
		},
		fs: {
			downloadFile: jest.fn(),
			uploadFile: jest.fn(),
			deleteFile: jest.fn(),
			createFolder: jest.fn(),
			listFiles: jest.fn(),
			getFileDetails: jest.fn(),
			moveFiles: jest.fn(),
		},
		start: jest.fn().mockResolvedValue(undefined),
		stop: jest.fn().mockResolvedValue(undefined),
		delete: jest.fn().mockResolvedValue(undefined),
		getWorkDir: jest.fn().mockResolvedValue('/home/daytona/workspace'),
	};
}

interface DaytonaClientLog {
	id: number;
	config: unknown;
	get: jest.Mock<Promise<MockSandbox>, [string]>;
	create: jest.Mock<Promise<MockSandbox>, [unknown, unknown?]>;
	delete: jest.Mock;
}

const clientLog: DaytonaClientLog[] = [];
let nextClientId = 1;
let nextSandboxId = 1;
const queuedGetErrors: Error[] = [];
const queuedGetResults: MockSandbox[] = [];
const queuedCreateResults: Array<MockSandbox | Error> = [];

// Each client's get() returns a NEW sandbox object so the test can detect
// refetch (i.e. .process / .fs identity changes after rotation).
function makeDaytonaClientForLog(config: unknown): DaytonaClientLog {
	const id = nextClientId++;
	const get = jest.fn<Promise<MockSandbox>, [string]>().mockImplementation(async () => {
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
	const create = jest
		.fn<Promise<MockSandbox>, [unknown, unknown?]>()
		.mockImplementation(async () => {
			const queued = queuedCreateResults.shift();
			if (queued instanceof Error) {
				return await Promise.reject(queued);
			}
			if (queued) return await Promise.resolve(queued);
			return await Promise.resolve(makeMockSandbox(`sb-create-${id}-${nextSandboxId++}`));
		});
	const del = jest.fn().mockResolvedValue(undefined);
	const log: DaytonaClientLog = { id, config, get, create, delete: del };
	clientLog.push(log);
	return log;
}

jest.mock('@daytonaio/sdk', () => {
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
	return { Daytona, DaytonaError, DaytonaNotFoundError };
});

import type * as DaytonaSdk from '@daytonaio/sdk';

import type { ErrorReporter, Logger } from '../../logger';
import { DaytonaFilesystem } from '../daytona-filesystem';
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
	const sdkMock = jest.requireMock<typeof DaytonaSdk>('@daytonaio/sdk');
	queuedGetErrors.push(new sdkMock.DaytonaNotFoundError(message));
}

function makeDaytonaError(message: string, statusCode?: number): Error {
	const sdkMock = jest.requireMock<typeof DaytonaSdk>('@daytonaio/sdk');
	return new sdkMock.DaytonaError(message, statusCode);
}

function makeLogger(): Logger {
	return {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	};
}

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const SKEW_MS = 5 * MINUTE_MS;

beforeEach(() => {
	clientLog.length = 0;
	nextClientId = 1;
	nextSandboxId = 1;
	queuedGetErrors.length = 0;
	queuedGetResults.length = 0;
	queuedCreateResults.length = 0;
});

describe('DaytonaSandbox (creation strategies)', () => {
	it('falls back from snapshot creation to image creation and preserves sandbox labels', async () => {
		const logger = makeLogger();
		const errorReporter: ErrorReporter = { error: jest.fn() };
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
		const errorReporter: ErrorReporter = { error: jest.fn() };
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
		const getAuthToken = jest.fn().mockResolvedValue(makeJwt(Date.now() + HOUR_MS));
		new DaytonaSandbox({ name: 'thread-1', getAuthToken });

		expect(getAuthToken).not.toHaveBeenCalled();
		expect(clientLog).toHaveLength(0);
	});

	it('reuses the same Daytona client across calls within the TTL window', async () => {
		const getAuthToken = jest.fn().mockResolvedValue(makeJwt(Date.now() + HOUR_MS));
		const sandbox = new DaytonaSandbox({ name: 'thread-1', getAuthToken });

		await sandbox.start();
		await sandbox.executeCommand('echo', ['hi']);
		await sandbox.executeCommand('echo', ['bye']);

		expect(getAuthToken).toHaveBeenCalledTimes(1);
		expect(clientLog).toHaveLength(1);
	});

	it('refetches the Sandbox via client.get() after the JWT rotates', async () => {
		jest.useFakeTimers().setSystemTime(new Date(1_700_000_000_000));
		try {
			const getAuthToken = jest.fn<Promise<string>, []>().mockImplementation(async () => {
				await Promise.resolve();
				return makeJwt(Date.now() + HOUR_MS);
			});
			const sandbox = new DaytonaSandbox({ name: 'thread-1', getAuthToken });

			await sandbox.start();
			const firstProcess = sandbox.instance.process;
			expect(getAuthToken).toHaveBeenCalledTimes(1);
			expect(clientLog).toHaveLength(1);

			// Advance into the skew window.
			jest.setSystemTime(new Date(Date.now() + HOUR_MS - SKEW_MS + 1));

			await sandbox.executeCommand('echo', ['after-refresh']);

			// New JWT minted, new Daytona client, sandbox refetched via client.get.
			expect(getAuthToken).toHaveBeenCalledTimes(2);
			expect(clientLog).toHaveLength(2);
			expect(clientLog[1].get).toHaveBeenCalledWith('thread-1');

			// `.process` is bound to the new client, so identity differs from before refresh.
			expect(sandbox.instance.process).not.toBe(firstProcess);
			expect(sandbox.instance.process.executeCommand).toHaveBeenCalled();
		} finally {
			jest.useRealTimers();
		}
	});

	it('refreshes on ensureAuthFresh() before fs operations', async () => {
		jest.useFakeTimers().setSystemTime(new Date(1_700_000_000_000));
		try {
			const getAuthToken = jest.fn<Promise<string>, []>().mockImplementation(async () => {
				await Promise.resolve();
				return makeJwt(Date.now() + HOUR_MS);
			});
			const sandbox = new DaytonaSandbox({ name: 'thread-1', getAuthToken });

			await sandbox.start();
			expect(getAuthToken).toHaveBeenCalledTimes(1);

			jest.setSystemTime(new Date(Date.now() + HOUR_MS - SKEW_MS + 1));
			await sandbox.ensureAuthFresh();

			expect(getAuthToken).toHaveBeenCalledTimes(2);
			expect(clientLog).toHaveLength(2);
		} finally {
			jest.useRealTimers();
		}
	});
});

describe('DaytonaSandbox (remote sandbox gone during refetch)', () => {
	// Common setup: start a sandbox in proxy mode, advance into the refresh skew
	// window, pre-arm the next Daytona client's get() to throw NotFound. The next
	// call into the sandbox triggers a token rotation; the refetch then surfaces
	// the remote-gone condition.
	async function startAndStageRemoteGone() {
		jest.useFakeTimers().setSystemTime(new Date(1_700_000_000_000));
		const getAuthToken = jest.fn<Promise<string>, []>().mockImplementation(async () => {
			await Promise.resolve();
			return makeJwt(Date.now() + HOUR_MS);
		});
		const sandbox = new DaytonaSandbox({ name: 'thread-1', getAuthToken });

		await sandbox.start();
		jest.setSystemTime(new Date(Date.now() + HOUR_MS - SKEW_MS + 1));
		queueNotFound();

		return sandbox;
	}

	afterEach(() => {
		jest.useRealTimers();
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
		// Second destroy goes through the no-local-sandbox branch. Need a fresh
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
		failing.process.executeCommand = jest
			.fn()
			.mockRejectedValue(makeDaytonaError('Endpoint not allowed', 403));
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
		jest.useFakeTimers().setSystemTime(new Date(1_700_000_000_000));
		const getAuthToken = jest.fn<Promise<string>, []>().mockImplementation(async () => {
			await Promise.resolve();
			return makeJwt(Date.now() + HOUR_MS);
		});
		const sandbox = new DaytonaSandbox({ name: 'thread-1', getAuthToken });
		await sandbox.start();

		jest.setSystemTime(new Date(Date.now() + HOUR_MS - SKEW_MS + 1));
		// Both the op's refetch and the recovery probe fail auth — the probe can't confirm a
		// not-running state, so the original error propagates and nothing is recreated.
		queuedGetErrors.push(
			makeDaytonaError('unauthorized', 401),
			makeDaytonaError('unauthorized', 401),
		);

		await expect(sandbox.executeCommand('echo', ['hi'])).rejects.toThrow(/unauthorized/i);
		expect(clientLog.every((c) => c.create.mock.calls.length === 0)).toBe(true);
	});

	it('executeCommand() propagates when the remote is still running (no false recovery)', async () => {
		// op fails but the probe finds the sandbox healthy → original error must surface.
		const healthy = makeMockSandbox('sb-healthy', 'started');
		healthy.process.executeCommand = jest
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
		failing.process.executeCommand = jest.fn().mockRejectedValue(new Error('boom'));
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
		failing.fs.getFileDetails = jest
			.fn()
			.mockRejectedValue(makeDaytonaError('Endpoint not allowed', 403));
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
		handle.fs.getFileDetails = jest.fn().mockRejectedValue(makeDaytonaError('file not found', 404));
		queuedGetResults.push(handle);

		const sandbox = new DaytonaSandbox({ name: 'thread-1', apiKey: 'key' });
		const filesystem = new DaytonaFilesystem(sandbox);

		await expect(filesystem.exists('/workspace/missing')).resolves.toBe(false);
		expect(clientLog.every((c) => c.create.mock.calls.length === 0)).toBe(true);
	});

	it('DaytonaFilesystem.appendFile() treats a genuine 404 as an empty file', async () => {
		const handle = makeMockSandbox('sb-1', 'started');
		handle.fs.downloadFile = jest.fn().mockRejectedValue(makeDaytonaError('file not found', 404));
		queuedGetResults.push(handle);

		const sandbox = new DaytonaSandbox({ name: 'thread-1', apiKey: 'key' });
		const filesystem = new DaytonaFilesystem(sandbox);

		await filesystem.appendFile('/workspace/log.txt', 'entry');
		expect(handle.fs.uploadFile).toHaveBeenCalled();
	});
});
