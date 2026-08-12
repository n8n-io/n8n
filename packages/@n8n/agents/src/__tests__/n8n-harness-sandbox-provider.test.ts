import { SandboxServiceError } from '@n8n/sandbox-client';

import {
	createN8nHarnessSandboxProvider,
	HarnessSessionExpiredError,
} from '../harness/n8n-sandbox-provider';

const sandboxClient = vi.hoisted(() => ({
	createSandbox: vi.fn().mockResolvedValue({ id: 'sandbox-1' }),
	deleteSandbox: vi.fn().mockResolvedValue(undefined),
	getSandbox: vi.fn().mockResolvedValue({ id: 'sandbox-1' }),
	resumeExecution: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
	deleteExecution: vi.fn().mockResolvedValue(undefined),
	readFile: vi.fn(),
	writeFile: vi.fn(),
	mkdir: vi.fn(),
}));

vi.mock('@n8n/sandbox-client', async (importOriginal) => {
	const original = await importOriginal<typeof import('@n8n/sandbox-client')>();
	return {
		...original,
		SandboxClient: class {
			createSandbox = sandboxClient.createSandbox;
			deleteSandbox = sandboxClient.deleteSandbox;
			getSandbox = sandboxClient.getSandbox;
			resumeExecution = sandboxClient.resumeExecution;
			deleteExecution = sandboxClient.deleteExecution;
			readFile = sandboxClient.readFile;
			writeFile = sandboxClient.writeFile;
			mkdir = sandboxClient.mkdir;
		},
	};
});

function executionResponse(lines: string[]): Response {
	const encoder = new TextEncoder();
	return new Response(
		new ReadableStream({
			start(controller) {
				controller.enqueue(encoder.encode(`${lines.join('\n')}\n`));
				controller.close();
			},
		}),
	);
}

async function readText(stream: ReadableStream<Uint8Array>): Promise<string> {
	const chunks: Uint8Array[] = [];
	for await (const chunk of stream) chunks.push(chunk);
	return new TextDecoder().decode(Buffer.concat(chunks));
}

function createProvider() {
	return createN8nHarnessSandboxProvider({
		serviceUrl: 'https://sandbox.test',
		harness: 'claude-code',
		ownershipEpoch: 3,
		claimToken: 'claim-1',
	});
}

describe('N8nHarnessSandboxProvider', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		sandboxClient.createSandbox.mockResolvedValue({ id: 'sandbox-1' });
		sandboxClient.getSandbox.mockResolvedValue({ id: 'sandbox-1' });
		sandboxClient.resumeExecution.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => vi.unstubAllGlobals());

	it('preserves process failures for delayed wait callers without an unhandled rejection', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(executionResponse(['not-json']));
		const session = await createProvider().createSession();
		const process = await session.spawn({ command: 'bad-command' });

		await new Promise((resolve) => setTimeout(resolve, 0));
		await expect(process.wait()).rejects.toBeInstanceOf(SandboxServiceError);
	});

	it('resumes an interrupted NDJSON execution after the last sequence number', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			executionResponse([
				JSON.stringify({ type: 'started', seq: 0, exec_id: 'exec-1' }),
				JSON.stringify({ type: 'stdout', seq: 1, data: 'hello ' }),
			]),
		);
		sandboxClient.resumeExecution.mockResolvedValue({
			exitCode: 0,
			stdout: 'world',
			stderr: '',
		});
		const session = await createProvider().createSession();
		const process = await session.spawn({ command: 'long-command' });
		const stdout = readText(process.stdout);

		await expect(process.wait()).resolves.toEqual({ exitCode: 0 });
		await expect(stdout).resolves.toBe('hello world');
		expect(sandboxClient.resumeExecution).toHaveBeenCalledWith('sandbox-1', expect.any(String), 1);
	});

	it('keeps the sandbox on stop and deletes it on destroy', async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ id: 'lease-1', url: 'wss://sandbox.test/bridge' })),
			)
			.mockResolvedValueOnce(new Response(null, { status: 204 }));
		const session = await createProvider().createSession();
		await session.getPortUrl({ port: 4000 });

		await session.stop();
		expect(sandboxClient.deleteSandbox).not.toHaveBeenCalled();

		if (!session.destroy) throw new Error('Expected a destroy implementation');
		await session.destroy();
		expect(sandboxClient.deleteSandbox).toHaveBeenCalledWith('sandbox-1');
	});

	it('maps a missing resumable sandbox to a session-expired outcome', async () => {
		sandboxClient.getSandbox.mockRejectedValue(new SandboxServiceError('missing', 404));
		const provider = createProvider();
		if (!provider.resumeSession) throw new Error('Expected a resume implementation');

		await expect(provider.resumeSession({ sessionId: 'missing-sandbox' })).rejects.toBeInstanceOf(
			HarnessSessionExpiredError,
		);
	});

	it('destroys a partially bootstrapped sandbox', async () => {
		await expect(
			createProvider().createSession({
				onFirstCreate: vi.fn().mockRejectedValue(new Error('bootstrap failed')),
			}),
		).rejects.toThrow('bootstrap failed');
		expect(sandboxClient.deleteSandbox).toHaveBeenCalledWith('sandbox-1');
	});
});
