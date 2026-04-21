import {
	DockerfileStepsBuilder,
	N8nSandboxClient,
	N8nSandboxServiceError,
} from '../n8n-sandbox-client';

function createJsonResponse(body: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
		...init,
	});
}

function bodyToRecord(body: unknown): Record<string, unknown> {
	if (typeof body !== 'string') {
		throw new Error('Expected request body to be a JSON string');
	}

	try {
		return JSON.parse(body) as Record<string, unknown>;
	} catch {
		throw new Error('Expected request body to be valid JSON');
	}
}

describe('N8nSandboxClient', () => {
	const originalFetch = global.fetch;

	afterEach(() => {
		global.fetch = originalFetch;
		jest.restoreAllMocks();
	});

	it('should send dockerfile_steps when DockerfileStepsBuilder is provided', async () => {
		const fetchMock = jest.fn().mockResolvedValueOnce(
			createJsonResponse({
				id: 'sandbox-1',
				status: 'running',
				provider: 'n8n-sandbox',
				image_id: 'img-123',
				created_at: 1,
				last_active_at: 2,
			}),
		) as jest.MockedFunction<typeof fetch>;
		global.fetch = fetchMock;

		const client = new N8nSandboxClient({
			baseUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
		});

		const dockerfile = new DockerfileStepsBuilder()
			.run('apt-get update')
			.run('apt-get install -y git');

		await client.createSandbox({ dockerfile });

		const body = bodyToRecord(fetchMock.mock.calls[0]?.[1]?.body);
		expect(body.dockerfile_steps).toEqual(['RUN apt-get update', 'RUN apt-get install -y git']);
	});

	it('should send no body when no options are provided', async () => {
		const fetchMock = jest.fn().mockResolvedValueOnce(
			createJsonResponse({
				id: 'sandbox-1',
				status: 'running',
				provider: 'n8n-sandbox',
				image_id: '',
				created_at: 1,
				last_active_at: 2,
			}),
		) as jest.MockedFunction<typeof fetch>;
		global.fetch = fetchMock;

		const client = new N8nSandboxClient({
			baseUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
		});

		await client.createSandbox();

		expect(fetchMock.mock.calls[0]?.[1]?.body).toBeUndefined();
	});

	it('should parse streamed exec output', async () => {
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(
					new TextEncoder().encode(
						'{"type":"stdout","data":"hello\\n"}\n' +
							'{"type":"stderr","data":"warn\\n"}\n' +
							'{"type":"exit","exit_code":0,"success":true,"execution_time_ms":42,"timed_out":false,"killed":false}\n',
					),
				);
				controller.close();
			},
		});
		global.fetch = jest.fn().mockResolvedValue(
			new Response(stream, {
				status: 200,
				headers: { 'Content-Type': 'application/x-ndjson' },
			}),
		) as jest.MockedFunction<typeof fetch>;

		const client = new N8nSandboxClient({
			baseUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
		});

		const stdoutChunks: string[] = [];
		const stderrChunks: string[] = [];
		const result = await client.exec('sandbox-1', {
			command: 'echo hello',
			onStdout: (data) => stdoutChunks.push(data),
			onStderr: (data) => stderrChunks.push(data),
		});

		expect(result).toEqual({
			exitCode: 0,
			stdout: 'hello\n',
			stderr: 'warn\n',
			executionTimeMs: 42,
			timedOut: false,
			killed: false,
			success: true,
		});
		expect(stdoutChunks).toEqual(['hello\n']);
		expect(stderrChunks).toEqual(['warn\n']);
	});

	it('should convert JSON error responses into service errors', async () => {
		global.fetch = jest.fn().mockResolvedValue(
			createJsonResponse(
				{
					error: 'sandbox missing',
					code: 404,
				},
				{ status: 404 },
			),
		) as jest.MockedFunction<typeof fetch>;

		const client = new N8nSandboxClient({
			baseUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
		});

		await expect(client.getSandbox('sandbox-1')).rejects.toMatchObject(
			new N8nSandboxServiceError('sandbox missing', 404, 404),
		);
	});
});
