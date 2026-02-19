import { STREAM_SEPARATOR } from '../../constants';
import type { AgentMessageChunk, StreamChunk, ToolProgressChunk } from '../../types/streaming';
import { AssistantHandler } from '../assistant-handler';
import type { AssistantContext, AssistantSdkClient, SdkStreamChunk, StreamWriter } from '../types';

/**
 * Create a mock Response with a ReadableStream body encoding the given chunks
 * as JSON separated by STREAM_SEPARATOR.
 */
function createMockSdkResponse(chunks: SdkStreamChunk[], ok = true, status = 200): Response {
	const encoder = new TextEncoder();
	const encoded = chunks.map((c) => JSON.stringify(c) + STREAM_SEPARATOR);

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const segment of encoded) {
				controller.enqueue(encoder.encode(segment));
			}
			controller.close();
		},
	});

	return {
		ok,
		status,
		body: stream,
	} as unknown as Response;
}

/**
 * Create a mock Response where the body is split into arbitrary byte boundaries
 * to test incomplete JSON buffering.
 */
function createSplitResponse(chunks: SdkStreamChunk[], splitAt: number): Response {
	const encoder = new TextEncoder();
	const fullString = chunks.map((c) => JSON.stringify(c) + STREAM_SEPARATOR).join('');
	const fullBytes = encoder.encode(fullString);

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(fullBytes.slice(0, splitAt));
			controller.enqueue(fullBytes.slice(splitAt));
			controller.close();
		},
	});

	return { ok: true, status: 200, body: stream } as unknown as Response;
}

function createMockClient(response: Response): AssistantSdkClient {
	return {
		chat: jest.fn().mockResolvedValue(response),
	};
}

describe('AssistantHandler', () => {
	let writtenChunks: StreamChunk[];
	let writer: StreamWriter;

	beforeEach(() => {
		writtenChunks = [];
		writer = (chunk) => {
			writtenChunks.push(chunk);
		};
	});

	it('should map SDK text message to AgentMessageChunk', async () => {
		const response = createMockSdkResponse([
			{
				sessionId: 'sess-1',
				messages: [{ role: 'assistant', type: 'message', text: 'Hello, how can I help?' }],
			},
		]);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		const result = await handler.execute({ query: 'Help me' }, 'user-1', writer);

		// Chunks: "Connecting..." progress, text message, "Done" completion
		expect(writtenChunks).toHaveLength(3);
		const progressChunk = writtenChunks[0] as ToolProgressChunk;
		expect(progressChunk.type).toBe('tool');
		expect(progressChunk.status).toBe('running');
		expect(progressChunk.toolCallId).toMatch(/^assistant-/);
		expect(progressChunk.customDisplayTitle).toBe('Connecting to assistant...');

		const chunk = writtenChunks[1] as AgentMessageChunk;
		expect(chunk.role).toBe('assistant');
		expect(chunk.type).toBe('message');
		expect(chunk.text).toBe('Hello, how can I help?');

		const doneChunk = writtenChunks[2] as ToolProgressChunk;
		expect(doneChunk.type).toBe('tool');
		expect(doneChunk.status).toBe('completed');
		// Same toolCallId within the same turn
		expect(doneChunk.toolCallId).toBe(progressChunk.toolCallId);

		expect(result.responseText).toBe('Hello, how can I help?');
	});

	it('should track sessionId from first chunk', async () => {
		const response = createMockSdkResponse([
			{
				sessionId: 'sess-abc',
				messages: [{ role: 'assistant', type: 'message', text: 'Hi' }],
			},
			{
				sessionId: 'sess-xyz',
				messages: [{ role: 'assistant', type: 'message', text: 'More' }],
			},
		]);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		const result = await handler.execute({ query: 'test' }, 'user-1', writer);

		expect(result.sdkSessionId).toBe('sess-abc');
	});

	it('should process multiple stream chunks', async () => {
		const response = createMockSdkResponse([
			{
				sessionId: 'sess-1',
				messages: [{ role: 'assistant', type: 'message', text: 'First' }],
			},
			{
				sessionId: 'sess-1',
				messages: [{ role: 'assistant', type: 'message', text: 'Second' }],
			},
		]);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		await handler.execute({ query: 'test' }, 'user-1', writer);

		// Chunks: connecting, First, Second, done
		expect(writtenChunks).toHaveLength(4);
		expect((writtenChunks[1] as AgentMessageChunk).text).toBe('First');
		expect((writtenChunks[2] as AgentMessageChunk).text).toBe('Second');
	});

	it('should degrade code-diff to AgentMessageChunk with fenced code block', async () => {
		const response = createMockSdkResponse([
			{
				sessionId: 'sess-1',
				messages: [
					{
						role: 'assistant',
						type: 'code-diff',
						description: 'Here is the fix',
						codeDiff: '- old\n+ new',
						suggestionId: 'sug-1',
					},
				],
			},
		]);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		const result = await handler.execute({ query: 'fix it' }, 'user-1', writer);

		// Chunks: connecting, code-diff message, done
		expect(writtenChunks).toHaveLength(3);
		const chunk = writtenChunks[1] as AgentMessageChunk;
		expect(chunk.type).toBe('message');
		expect(chunk.text).toContain('Here is the fix');
		expect(chunk.text).toContain('```diff');
		expect(chunk.text).toContain('- old\n+ new');
		expect(result.hasCodeDiff).toBe(true);
		expect(result.suggestionIds).toContain('sug-1');
	});

	it('should degrade summary message to markdown text', async () => {
		const response = createMockSdkResponse([
			{
				sessionId: 'sess-1',
				messages: [
					{
						role: 'assistant',
						type: 'summary',
						title: 'Summary Title',
						content: 'Summary content here',
					},
				],
			},
		]);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		await handler.execute({ query: 'test' }, 'user-1', writer);

		// Chunks: connecting, summary message, done
		expect(writtenChunks).toHaveLength(3);
		const chunk = writtenChunks[1] as AgentMessageChunk;
		expect(chunk.text).toBe('**Summary Title**\n\nSummary content here');
	});

	it('should degrade agent-suggestion to markdown text', async () => {
		const response = createMockSdkResponse([
			{
				sessionId: 'sess-1',
				messages: [
					{
						role: 'assistant',
						type: 'agent-suggestion',
						title: 'Try this',
						text: 'Use the HTTP node instead',
						suggestionId: 'sug-2',
					},
				],
			},
		]);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		const result = await handler.execute({ query: 'test' }, 'user-1', writer);

		// Chunks: connecting, suggestion message, done
		expect(writtenChunks).toHaveLength(3);
		const chunk = writtenChunks[1] as AgentMessageChunk;
		expect(chunk.text).toBe('**Try this**\n\nUse the HTTP node instead');
		expect(result.suggestionIds).toContain('sug-2');
	});

	it('should emit intermediate-step messages as tool progress updates', async () => {
		const response = createMockSdkResponse([
			{
				sessionId: 'sess-1',
				messages: [
					{
						role: 'assistant',
						type: 'intermediate-step',
						text: 'Searching documentation...',
						step: 'n8n_documentation',
					},
				],
			},
		]);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		await handler.execute({ query: 'test' }, 'user-1', writer);

		// Chunks: connecting, intermediate step, done
		expect(writtenChunks).toHaveLength(3);
		expect((writtenChunks[0] as ToolProgressChunk).status).toBe('running');
		expect((writtenChunks[0] as ToolProgressChunk).customDisplayTitle).toBe(
			'Connecting to assistant...',
		);

		const connectingChunk = writtenChunks[0] as ToolProgressChunk;
		const stepChunk = writtenChunks[1] as ToolProgressChunk;
		expect(stepChunk.type).toBe('tool');
		expect(stepChunk.toolName).toBe('assistant');
		expect(stepChunk.status).toBe('running');
		expect(stepChunk.customDisplayTitle).toBe('Searching documentation...');
		// Same toolCallId as the initial connecting chunk (same turn)
		expect(stepChunk.toolCallId).toBe(connectingChunk.toolCallId);

		expect((writtenChunks[2] as ToolProgressChunk).status).toBe('completed');
	});

	it('should silently consume event messages without writing', async () => {
		const response = createMockSdkResponse([
			{
				sessionId: 'sess-1',
				messages: [{ type: 'event', eventName: 'end-session' }],
			},
		]);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		await handler.execute({ query: 'test' }, 'user-1', writer);

		// Chunks: connecting, done (event message is consumed silently)
		expect(writtenChunks).toHaveLength(2);
		expect((writtenChunks[0] as ToolProgressChunk).customDisplayTitle).toBe(
			'Connecting to assistant...',
		);
		expect((writtenChunks[1] as ToolProgressChunk).status).toBe('completed');
	});

	it('should map error message to AgentMessageChunk', async () => {
		const response = createMockSdkResponse([
			{
				sessionId: 'sess-1',
				messages: [
					{
						role: 'assistant',
						type: 'error',
						text: 'Something went wrong',
					},
				],
			},
		]);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		await handler.execute({ query: 'test' }, 'user-1', writer);

		// Chunks: connecting, error message, done
		expect(writtenChunks).toHaveLength(3);
		const chunk = writtenChunks[1] as AgentMessageChunk;
		expect(chunk.type).toBe('message');
		expect(chunk.text).toBe('Something went wrong');
	});

	it('should not write chunks for empty text messages', async () => {
		const response = createMockSdkResponse([
			{
				sessionId: 'sess-1',
				messages: [{ role: 'assistant', type: 'message', text: '' }],
			},
		]);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		await handler.execute({ query: 'test' }, 'user-1', writer);

		// Chunks: connecting, done (empty text message is skipped)
		expect(writtenChunks).toHaveLength(2);
	});

	it('should collect all text and truncate summary to 200 chars', async () => {
		const longText = 'A'.repeat(150);
		const response = createMockSdkResponse([
			{
				sessionId: 'sess-1',
				messages: [
					{ role: 'assistant', type: 'message', text: longText },
					{ role: 'assistant', type: 'message', text: longText },
				],
			},
		]);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		const result = await handler.execute({ query: 'test' }, 'user-1', writer);

		expect(result.responseText).toBe(`${longText}\n${longText}`);
		expect(result.summary.length).toBeLessThanOrEqual(203); // 200 + '...'
		expect(result.summary.endsWith('...')).toBe(true);
	});

	it('should throw on non-ok SDK response and still emit Done', async () => {
		const response = createMockSdkResponse([], false, 500);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		await expect(handler.execute({ query: 'test' }, 'user-1', writer)).rejects.toThrow(
			'Assistant SDK returned HTTP 500',
		);

		// "Done" must still be emitted so the frontend clears the thinking indicator
		const doneChunk = writtenChunks.find(
			(c): c is ToolProgressChunk => c.type === 'tool' && c.status === 'completed',
		);
		expect(doneChunk).toBeDefined();
		expect(doneChunk!.customDisplayTitle).toBe('Done');
	});

	it('should throw when response body is null and still emit Done', async () => {
		const response = { ok: true, status: 200, body: null } as unknown as Response;
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		await expect(handler.execute({ query: 'test' }, 'user-1', writer)).rejects.toThrow(
			'Assistant SDK response has no body',
		);

		// "Done" must still be emitted so the frontend clears the thinking indicator
		const doneChunk = writtenChunks.find(
			(c): c is ToolProgressChunk => c.type === 'tool' && c.status === 'completed',
		);
		expect(doneChunk).toBeDefined();
		expect(doneChunk!.customDisplayTitle).toBe('Done');
	});

	it('should return immediately without error when signal is pre-aborted', async () => {
		const controller = new AbortController();
		controller.abort(); // Pre-abort before calling execute

		const response = createMockSdkResponse([
			{
				sessionId: 'sess-1',
				messages: [{ role: 'assistant', type: 'message', text: 'Should not process' }],
			},
		]);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		const result = await handler.execute({ query: 'test' }, 'user-1', writer, controller.signal);

		expect(result.responseText).toBe('');
		expect(result.hasCodeDiff).toBe(false);
		// Chunks: connecting, done (stream is aborted before any SDK chunks)
		expect(writtenChunks).toHaveLength(2);
	});

	it('should correctly parse JSON split across two reader.read() calls', async () => {
		const chunks: SdkStreamChunk[] = [
			{
				sessionId: 'sess-1',
				messages: [{ role: 'assistant', type: 'message', text: 'Buffered correctly' }],
			},
		];

		const response = createSplitResponse(chunks, 10);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		const result = await handler.execute({ query: 'test' }, 'user-1', writer);

		// Chunks: connecting, text message, done
		expect(writtenChunks).toHaveLength(3);
		expect((writtenChunks[1] as AgentMessageChunk).text).toBe('Buffered correctly');
		expect(result.responseText).toBe('Buffered correctly');
	});

	it('should build init-support-chat payload for initial message', () => {
		const client = createMockClient(createMockSdkResponse([]));
		const handler = new AssistantHandler(client);

		const context: AssistantContext = {
			query: 'How do I use the HTTP node?',
			userName: 'Alice',
		};

		const payload = handler.buildSdkPayload(context);

		expect(payload.sessionId).toBeUndefined();
		expect(payload.payload).toEqual(
			expect.objectContaining({
				role: 'user',
				type: 'init-support-chat',
				user: { firstName: 'Alice' },
				question: 'How do I use the HTTP node?',
			}),
		);
	});

	it('should build UserChatMessage payload for continuation', () => {
		const client = createMockClient(createMockSdkResponse([]));
		const handler = new AssistantHandler(client);

		const context: AssistantContext = {
			query: 'Can you explain more?',
			sdkSessionId: 'sess-existing',
		};

		const payload = handler.buildSdkPayload(context);

		expect(payload.sessionId).toBe('sess-existing');
		expect(payload.payload).toEqual({
			role: 'user',
			type: 'message',
			text: 'Can you explain more?',
		});
	});

	it('should include workflowContext in init payload when workflowJSON is provided', () => {
		const client = createMockClient(createMockSdkResponse([]));
		const handler = new AssistantHandler(client);

		const context: AssistantContext = {
			query: 'Why is my workflow failing?',
			workflowJSON: {
				name: 'Test Workflow',
				nodes: [],
				connections: {},
			},
		};

		const payload = handler.buildSdkPayload(context);

		expect(payload.payload).toEqual(
			expect.objectContaining({
				type: 'init-support-chat',
				workflowContext: {
					currentWorkflow: {
						name: 'Test Workflow',
						nodes: [],
						connections: {},
					},
				},
			}),
		);
	});

	it('should set hasCodeDiff to false when no code-diff messages present', async () => {
		const response = createMockSdkResponse([
			{
				sessionId: 'sess-1',
				messages: [{ role: 'assistant', type: 'message', text: 'Just text' }],
			},
		]);
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		const result = await handler.execute({ query: 'test' }, 'user-1', writer);

		expect(result.hasCodeDiff).toBe(false);
		expect(result.suggestionIds).toEqual([]);
	});

	it('should default userName to "User" when not provided', () => {
		const client = createMockClient(createMockSdkResponse([]));
		const handler = new AssistantHandler(client);

		const payload = handler.buildSdkPayload({ query: 'Hello' });

		expect(payload.payload).toEqual(
			expect.objectContaining({
				user: { firstName: 'User' },
			}),
		);
	});

	it('should emit "Done" tool status even when remaining buffer causes an error', async () => {
		// Simulate an SDK response where the stream ends with non-JSON garbage
		// (e.g., a plain-text error from the SDK). The "Done" chunk must still be
		// emitted so the frontend clears the thinking indicator.
		const encoder = new TextEncoder();
		const validChunk = JSON.stringify({
			sessionId: 'sess-1',
			messages: [{ role: 'assistant', type: 'message', text: 'Some response' }],
		} satisfies SdkStreamChunk);
		const trailingGarbage = 'Internal Server Error';

		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(encoder.encode(validChunk + STREAM_SEPARATOR + trailingGarbage));
				controller.close();
			},
		});

		const response = { ok: true, status: 200, body: stream } as unknown as Response;
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		await expect(handler.execute({ query: 'test' }, 'user-1', writer)).rejects.toThrow(
			'Assistant SDK error',
		);

		// Even though the call threw, the "Done" chunk should have been emitted
		const doneChunk = writtenChunks.find(
			(c): c is ToolProgressChunk => c.type === 'tool' && c.status === 'completed',
		);
		expect(doneChunk).toBeDefined();
		expect(doneChunk!.customDisplayTitle).toBe('Done');

		// The text message should also have been written before the error
		const textChunk = writtenChunks.find(
			(c): c is AgentMessageChunk => c.type === 'message' && 'text' in c,
		);
		expect(textChunk).toBeDefined();
		expect(textChunk!.text).toBe('Some response');
	});

	it('should emit "Done" tool status even when reader.read() throws', async () => {
		// Simulate a network error mid-stream
		let readCount = 0;
		const encoder = new TextEncoder();
		const stream = new ReadableStream<Uint8Array>({
			pull(controller) {
				readCount++;
				if (readCount === 1) {
					const chunk = JSON.stringify({
						sessionId: 'sess-1',
						messages: [{ role: 'assistant', type: 'message', text: 'Partial' }],
					} satisfies SdkStreamChunk);
					controller.enqueue(encoder.encode(chunk + STREAM_SEPARATOR));
				} else {
					controller.error(new Error('Network failure'));
				}
			},
		});

		const response = { ok: true, status: 200, body: stream } as unknown as Response;
		const client = createMockClient(response);
		const handler = new AssistantHandler(client);

		await expect(handler.execute({ query: 'test' }, 'user-1', writer)).rejects.toThrow(
			'Network failure',
		);

		// "Done" must still be emitted despite the read error
		const doneChunk = writtenChunks.find(
			(c): c is ToolProgressChunk => c.type === 'tool' && c.status === 'completed',
		);
		expect(doneChunk).toBeDefined();
		expect(doneChunk!.customDisplayTitle).toBe('Done');
	});
});
