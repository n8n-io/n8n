// Mock @daytonaio/sdk so we can drive token refresh + sandbox refetch behavior
// from Jest without touching the network.

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
	get: jest.Mock;
	create: jest.Mock;
	delete: jest.Mock;
}

const clientLog: DaytonaClientLog[] = [];
let nextClientId = 1;
let nextSandboxId = 1;

// Each client's get() returns a NEW sandbox object so the test can detect
// refetch (i.e. .process / .fs identity changes after rotation).
function makeDaytonaClientForLog(config: unknown): DaytonaClientLog {
	const id = nextClientId++;
	const get = jest
		.fn<Promise<MockSandbox>, [string]>()
		.mockImplementation(
			async () => await Promise.resolve(makeMockSandbox(`sb-${id}-${nextSandboxId++}`)),
		);
	const create = jest
		.fn<Promise<MockSandbox>, [unknown]>()
		.mockImplementation(
			async () => await Promise.resolve(makeMockSandbox(`sb-create-${id}-${nextSandboxId++}`)),
		);
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

import { DaytonaSandbox } from '../daytona-sandbox';

function base64url(input: string): string {
	return Buffer.from(input, 'utf8').toString('base64url');
}
function makeJwt(expMs: number): string {
	const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const payload = base64url(JSON.stringify({ exp: Math.floor(expMs / 1000) }));
	return `${header}.${payload}.sig`;
}

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const SKEW_MS = 5 * MINUTE_MS;

beforeEach(() => {
	clientLog.length = 0;
	nextClientId = 1;
	nextSandboxId = 1;
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

describe('DaytonaSandbox (proxy mode — JWT refresh)', () => {
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
