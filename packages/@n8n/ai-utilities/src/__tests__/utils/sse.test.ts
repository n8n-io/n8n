import type { ServerSentEventMessage } from 'src/utils/sse';
import { parseSSEStream } from 'src/utils/sse';

describe('parseSSEStream', () => {
	// Helper to create a ReadableStream from string chunks
	function createStreamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
		const encoder = new TextEncoder();
		let index = 0;

		return new ReadableStream<Uint8Array>({
			pull(controller) {
				if (index < chunks.length) {
					controller.enqueue(encoder.encode(chunks[index]));
					index++;
				} else {
					controller.close();
				}
			},
		});
	}

	// Helper to collect all events from stream
	async function collectEvents(
		stream: ReadableStream<Uint8Array>,
	): Promise<ServerSentEventMessage[]> {
		const events: ServerSentEventMessage[] = [];
		for await (const event of parseSSEStream(stream)) {
			events.push(event);
		}
		return events;
	}

	it('should parse simple data-only event', async () => {
		const stream = createStreamFromChunks(['data: hello\n\n']);
		const events = await collectEvents(stream);

		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({ data: 'hello' });
	});

	it('should parse multiple events', async () => {
		const stream = createStreamFromChunks(['data: first\n\ndata: second\n\n']);
		const events = await collectEvents(stream);

		expect(events).toHaveLength(2);
		expect(events[0]).toEqual({ data: 'first' });
		expect(events[1]).toEqual({ data: 'second' });
	});

	it('should parse complete event with all fields', async () => {
		const stream = createStreamFromChunks([
			'event: update\nid: 42\ndata: test data\nretry: 5000\n\n',
		]);
		const events = await collectEvents(stream);

		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({
			event: 'update',
			id: 42,
			data: 'test data',
			retry: 5000,
		});
	});

	it('should parse event with string id', async () => {
		const stream = createStreamFromChunks(['id: abc-123\ndata: hello\n\n']);
		const events = await collectEvents(stream);

		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({ id: 'abc-123', data: 'hello' });
	});

	describe('multi-line data', () => {
		it('should join multiple data fields with newlines', async () => {
			const stream = createStreamFromChunks(['data: line 1\ndata: line 2\ndata: line 3\n\n']);
			const events = await collectEvents(stream);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({ data: 'line 1\nline 2\nline 3' });
		});

		it('should handle empty data fields', async () => {
			const stream = createStreamFromChunks(['data: first\ndata:\ndata: third\n\n']);
			const events = await collectEvents(stream);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({ data: 'first\n\nthird' });
		});
	});

	it('should handle mixed line endings (LF, CRLF, CR)', async () => {
		const stream = createStreamFromChunks(['data: line1\r\ndata: line2\ndata: line3\r\r']);
		const events = await collectEvents(stream);

		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({ data: 'line1\nline2\nline3' });
	});

	it('should handle comments and trim leading space', async () => {
		const stream = createStreamFromChunks([':   comment with spaces\ndata: hello\n\n']);
		const events = await collectEvents(stream);

		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({ comment: 'comment with spaces', data: 'hello' });
	});

	describe('field value parsing', () => {
		it('should remove single leading space after colon', async () => {
			const stream = createStreamFromChunks(['data:  value with space\n\n']);
			const events = await collectEvents(stream);

			expect(events).toHaveLength(1);
			// First space is removed, subsequent spaces are preserved
			expect(events[0]).toEqual({ data: ' value with space' });
		});

		it('should handle field with no value', async () => {
			const stream = createStreamFromChunks(['data\n\n']);
			const events = await collectEvents(stream);

			expect(events).toHaveLength(1);
			// Field with no value results in undefined data per SSE spec
			expect(events[0]).toEqual({ data: undefined });
		});

		it('should handle empty id field (should not set id)', async () => {
			const stream = createStreamFromChunks(['id:\ndata: hello\n\n']);
			const events = await collectEvents(stream);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({ data: 'hello' });
			expect(events[0].id).toBeUndefined();
		});

		it('should ignore invalid retry values', async () => {
			const stream = createStreamFromChunks(['retry: invalid\ndata: hello\n\n']);
			const events = await collectEvents(stream);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({ data: 'hello' });
			expect(events[0].retry).toBeUndefined();
		});

		it('should ignore negative retry values', async () => {
			const stream = createStreamFromChunks(['retry: -1000\ndata: hello\n\n']);
			const events = await collectEvents(stream);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({ data: 'hello' });
			expect(events[0].retry).toBeUndefined();
		});

		it('should ignore unknown fields', async () => {
			const stream = createStreamFromChunks(['unknown: field\ndata: hello\n\n']);
			const events = await collectEvents(stream);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({ data: 'hello' });
		});
	});

	it('should handle data split across chunks', async () => {
		const stream = createStreamFromChunks(['data: hel', 'lo\n\n']);
		const events = await collectEvents(stream);

		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({ data: 'hello' });
	});

	it('should handle multiple events split across chunks', async () => {
		const stream = createStreamFromChunks(['data: fir', 'st\n\nda', 'ta: sec', 'ond\n\n']);
		const events = await collectEvents(stream);

		expect(events).toHaveLength(2);
		expect(events[0]).toEqual({ data: 'first' });
		expect(events[1]).toEqual({ data: 'second' });
	});

	it('should handle UTF-8 sequences split across chunks', async () => {
		// Split a multi-byte UTF-8 character across chunks
		const encoder = new TextEncoder();
		const fullText = 'data: 你好\n\n';
		const bytes = encoder.encode(fullText);

		// Split in the middle of a multi-byte character
		const chunk1 = bytes.slice(0, 8);
		const chunk2 = bytes.slice(8);

		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(chunk1);
				controller.enqueue(chunk2);
				controller.close();
			},
		});

		const events = await collectEvents(stream);

		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({ data: '你好' });
	});

	it('should handle empty stream', async () => {
		const stream = createStreamFromChunks([]);
		const events = await collectEvents(stream);

		expect(events).toHaveLength(0);
	});

	it('should handle incomplete event at end of stream', async () => {
		const stream = createStreamFromChunks(['data: incomplete']);
		const events = await collectEvents(stream);

		// Incomplete events are flushed at end
		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({ data: 'incomplete' });
	});

	it('should not yield events with no content and handle empty lines', async () => {
		const stream = createStreamFromChunks(['\n\n\n\ndata: hello\n\n\n\n']);
		const events = await collectEvents(stream);

		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({ data: 'hello' });
	});

	describe('real-world scenarios', () => {
		it('should parse typical SSE chat stream', async () => {
			const stream = createStreamFromChunks([
				'event: message\n',
				'id: 1\n',
				'data: {"text": "Hello"}\n',
				'\n',
				'event: message\n',
				'id: 2\n',
				'data: {"text": " world"}\n',
				'\n',
			]);
			const events = await collectEvents(stream);

			expect(events).toHaveLength(2);
			expect(events[0]).toEqual({ event: 'message', id: 1, data: '{"text": "Hello"}' });
			expect(events[1]).toEqual({ event: 'message', id: 2, data: '{"text": " world"}' });
		});

		it('should parse OpenAI-style streaming', async () => {
			const stream = createStreamFromChunks([
				'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
				'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
				'data: [DONE]\n\n',
			]);
			const events = await collectEvents(stream);

			expect(events).toHaveLength(3);
			expect(events[0]).toEqual({ data: '{"choices":[{"delta":{"content":"Hello"}}]}' });
			expect(events[1]).toEqual({ data: '{"choices":[{"delta":{"content":" world"}}]}' });
			expect(events[2]).toEqual({ data: '[DONE]' });
		});

		it('should parse events with metadata and heartbeats', async () => {
			const stream = createStreamFromChunks([
				': heartbeat\n',
				'\n',
				'event: status\n',
				'data: connected\n',
				'\n',
				': heartbeat\n',
				'\n',
				'event: data\n',
				'data: actual data\n',
				'\n',
			]);
			const events = await collectEvents(stream);

			expect(events).toHaveLength(2);
			// First event includes comment from preceding line
			expect(events[0]).toEqual({ comment: 'heartbeat', event: 'status', data: 'connected' });
			expect(events[1]).toEqual({ comment: 'heartbeat', event: 'data', data: 'actual data' });
		});
	});
});
