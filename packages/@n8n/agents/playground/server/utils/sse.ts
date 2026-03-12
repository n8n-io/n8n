import type { H3Event } from 'h3';

export interface SSEStream {
	send(data: Record<string, unknown>): void;
	done(): void;
	error(message: string): void;
}
/**
 * Helper for sending Server-Sent Events. Handles JSON serialization
 * and the SSE wire format so callers don't repeat `data: ...\n\n`.
 *
 * Disables Nagle's algorithm and output buffering so each write
 * flushes immediately — critical for real-time streaming.
 */
export function createSSE(event: H3Event): SSEStream {
	setResponseHeaders(event, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no', // Disable nginx proxy buffering if present
	});

	const res = event.node.res;

	// Disable Nagle's algorithm so small writes flush immediately
	res.socket?.setNoDelay(true);

	// Flush headers now so the client receives them immediately
	res.flushHeaders();

	return {
		send(data: Record<string, unknown>) {
			res.write(`data: ${JSON.stringify(data)}\n\n`);
		},
		done() {
			res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
			res.end();
		},
		error(message: string) {
			res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
			res.end();
		},
	};
}
