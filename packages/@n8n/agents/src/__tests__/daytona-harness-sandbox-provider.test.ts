const daytona = vi.hoisted(() => {
	const sandboxInstances: MockDaytonaSandbox[] = [];
	const files = new Map<string, Buffer>();
	let reconnectMissing = false;
	let onPtyData: ((data: Uint8Array) => void | Promise<void>) | undefined;
	let resolvePtyWait: ((value: { exitCode?: number; error?: string }) => void) | undefined;

	const remote = {
		getWorkDir: vi.fn().mockResolvedValue('/home/daytona'),
		getSignedPreviewUrl: vi.fn().mockResolvedValue({
			url: 'https://4000-signed-token.proxy.daytona.test',
			token: 'signed-token',
		}),
		expireSignedPreviewUrl: vi.fn().mockResolvedValue(undefined),
		process: {
			createPty: vi.fn().mockImplementation(async (options: { onData: typeof onPtyData }) => {
				await Promise.resolve();
				onPtyData = options.onData;
				return pty;
			}),
		},
	};
	const pty = {
		waitForConnection: vi.fn().mockResolvedValue(undefined),
		sendInput: vi.fn().mockResolvedValue(undefined),
		wait: vi.fn(
			async () =>
				await new Promise<{ exitCode?: number; error?: string }>((resolve) => {
					resolvePtyWait = resolve;
				}),
		),
		kill: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn().mockResolvedValue(undefined),
	};

	class DaytonaSandboxNotFoundError extends Error {}

	class MockDaytonaSandbox {
		readonly id: string;
		readonly options: Record<string, unknown>;
		readonly _start = vi.fn(async () => {
			await Promise.resolve();
			if (this.options.reconnectOnly === true && reconnectMissing) {
				throw new DaytonaSandboxNotFoundError();
			}
		});
		readonly _stop = vi.fn().mockResolvedValue(undefined);
		readonly _destroy = vi.fn().mockResolvedValue(undefined);
		readonly destroy = vi.fn().mockResolvedValue(undefined);
		readonly executeCommand = vi.fn().mockResolvedValue({
			exitCode: 0,
			stdout: 'done',
			stderr: '',
		});
		readonly withSandbox = vi.fn(
			async (operation: (sandbox: typeof remote) => Promise<unknown>) => await operation(remote),
		);

		constructor(options: Record<string, unknown>) {
			this.id = String(options.id);
			this.options = options;
			sandboxInstances.push(this);
		}
	}

	class MockDaytonaFilesystem {
		constructor(_sandbox: MockDaytonaSandbox) {}

		async readFile(path: string): Promise<Buffer> {
			await Promise.resolve();
			const value = files.get(path);
			if (value) return value;
			const error = Object.assign(new Error(`File not found: ${path}`), { statusCode: 404 });
			throw error;
		}

		async writeFile(path: string, content: string | Buffer | Uint8Array): Promise<void> {
			await Promise.resolve();
			files.set(path, typeof content === 'string' ? Buffer.from(content) : Buffer.from(content));
		}
	}

	const reset = () => {
		sandboxInstances.length = 0;
		files.clear();
		reconnectMissing = false;
		onPtyData = undefined;
		resolvePtyWait = undefined;
	};

	return {
		DaytonaSandbox: MockDaytonaSandbox,
		DaytonaSandboxNotFoundError,
		DaytonaFilesystem: MockDaytonaFilesystem,
		sandboxInstances,
		files,
		remote,
		pty,
		reset,
		setReconnectMissing: (value: boolean) => {
			reconnectMissing = value;
		},
		emitPtyData: async (value: string) => await onPtyData?.(new TextEncoder().encode(value)),
		completePty: (result: { exitCode?: number; error?: string }) => resolvePtyWait?.(result),
	};
});

vi.mock('../workspace/sandbox/daytona-sandbox', () => ({
	DaytonaSandbox: daytona.DaytonaSandbox,
	DaytonaSandboxNotFoundError: daytona.DaytonaSandboxNotFoundError,
}));

vi.mock('../workspace/filesystem/daytona-filesystem', () => ({
	DaytonaFilesystem: daytona.DaytonaFilesystem,
}));

import {
	createDaytonaHarnessSandboxProvider,
	destroyDaytonaHarnessSandbox,
} from '../harness/daytona-sandbox-provider';
import { HarnessSessionExpiredError } from '../harness/n8n-sandbox-provider';

async function readText(stream: ReadableStream<Uint8Array>): Promise<string> {
	const chunks: Uint8Array[] = [];
	for await (const chunk of stream) chunks.push(chunk);
	return new TextDecoder().decode(Buffer.concat(chunks));
}

function createProvider() {
	return createDaytonaHarnessSandboxProvider({
		apiKey: 'daytona-key',
		apiUrl: 'https://daytona.test',
		harness: 'claude-code',
		image: 'daytonaio/sandbox:0.5.0',
		previewUrlTtlSeconds: 3600,
	});
}

describe('DaytonaHarnessSandboxProvider', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		daytona.reset();
	});

	it('creates a direct Daytona session and resolves a signed WebSocket preview', async () => {
		const onFirstCreate = vi.fn().mockResolvedValue(undefined);
		const session = await createProvider().createSession({
			sessionId: 'session-1',
			onFirstCreate,
		});

		expect(daytona.sandboxInstances[0]?.options).toMatchObject({
			id: 'session-1',
			name: 'session-1',
			apiKey: 'daytona-key',
			apiUrl: 'https://daytona.test',
			labels: { n8n_harness_adapter: 'claude-code' },
			public: false,
		});
		expect(onFirstCreate).toHaveBeenCalledOnce();
		await expect(session.getPortUrl({ port: 4000, protocol: 'ws' })).resolves.toBe(
			'wss://4000-signed-token.proxy.daytona.test/',
		);
		expect(daytona.remote.getSignedPreviewUrl).toHaveBeenCalledWith(4000, 3600);

		await session.stop();
		expect(daytona.remote.expireSignedPreviewUrl).toHaveBeenCalledWith(4000, 'signed-token');
		expect(daytona.sandboxInstances[0]?._stop).toHaveBeenCalledOnce();
	});

	it('streams a long-running command through a Daytona PTY', async () => {
		const session = await createProvider().createSession({ sessionId: 'session-1' });
		const process = await session.spawn({
			command: 'node bridge.mjs',
			workingDirectory: '/workspace',
			env: { ANTHROPIC_API_KEY: 'model-key' },
		});
		const stdout = readText(process.stdout);

		expect(daytona.remote.process.createPty).toHaveBeenCalledWith(
			expect.objectContaining({
				cwd: '/workspace',
				envs: { ANTHROPIC_API_KEY: 'model-key' },
			}),
		);
		expect(daytona.pty.waitForConnection).toHaveBeenCalledOnce();
		expect(daytona.pty.sendInput).toHaveBeenCalledWith('node bridge.mjs\nexit $?\n');
		await daytona.emitPtyData('bridge output');
		daytona.completePty({ exitCode: 0 });

		await expect(process.wait()).resolves.toEqual({ exitCode: 0 });
		await expect(stdout).resolves.toBe('bridge output');
	});

	it('maps file operations and blocking commands onto the existing Daytona adapters', async () => {
		daytona.files.set('/workspace/input.txt', Buffer.from('one\ntwo\nthree'));
		const session = await createProvider().createSession({ sessionId: 'session-1' });

		await expect(
			session.readTextFile({ path: '/workspace/input.txt', startLine: 2, endLine: 3 }),
		).resolves.toBe('two\nthree');
		await expect(
			session.readTextFile({ path: '/home/daytona/.harness-bootstrap/missing.ok' }),
		).resolves.toBeNull();
		await session.writeTextFile({ path: '/workspace/output.txt', content: 'saved' });
		expect(daytona.files.get('/workspace/output.txt')?.toString()).toBe('saved');
		await expect(session.run({ command: 'pnpm --version' })).resolves.toEqual({
			exitCode: 0,
			stdout: 'done',
			stderr: '',
		});
		expect(daytona.sandboxInstances[0]?.executeCommand).toHaveBeenCalledWith(
			'sh',
			[
				'-lc',
				[
					'if command -v pnpm >/dev/null 2>&1; then',
					'  pnpm --version',
					'elif command -v corepack >/dev/null 2>&1; then',
					'  corepack pnpm --version',
					'elif command -v npm >/dev/null 2>&1; then',
					'  npm exec --yes --package=pnpm@10.32.1 -- pnpm --version',
					'else',
					'  echo "Harness bootstrap requires Node.js with pnpm, corepack, or npm" >&2',
					'  exit 127',
					'fi',
				].join('\n'),
			],
			expect.objectContaining({}),
		);
	});

	it('maps a missing resumable Daytona sandbox to a session-expired outcome', async () => {
		daytona.setReconnectMissing(true);
		const provider = createProvider();
		if (!provider.resumeSession) throw new Error('Expected a resume implementation');

		await expect(provider.resumeSession({ sessionId: 'missing' })).rejects.toBeInstanceOf(
			HarnessSessionExpiredError,
		);
	});

	it('destroys partially bootstrapped and explicitly cleaned-up sandboxes', async () => {
		await expect(
			createProvider().createSession({
				sessionId: 'session-1',
				onFirstCreate: vi.fn().mockRejectedValue(new Error('bootstrap failed')),
			}),
		).rejects.toThrow('bootstrap failed');
		expect(daytona.sandboxInstances[0]?._destroy).toHaveBeenCalledOnce();

		await destroyDaytonaHarnessSandbox({
			apiKey: 'daytona-key',
			apiUrl: 'https://daytona.test',
			sandboxId: 'session-2',
		});
		expect(daytona.sandboxInstances[1]?.destroy).toHaveBeenCalledOnce();
	});
});
