import type { ResponseTransport } from './response-transport';

/**
 * In-process `ResponseTransport`, for a deployment where both planes share a
 * process.
 *
 * It carries frames rather than objects, exactly as a networked transport does.
 * The `JSON.stringify` it pays for is the point: an integrated deployment that
 * passed live objects would accept a response a split deployment mangles, and
 * the integrated one is the one under test.
 */
export class InMemoryResponseTransport implements ResponseTransport {
	private readonly handlers = new Set<(frame: string) => void>();

	publish(frame: string): void {
		// Copied, so a handler that unsubscribes mid-delivery cannot alter the set
		// being walked.
		for (const handler of [...this.handlers]) handler(frame);
	}

	subscribe(handler: (frame: string) => void): void {
		this.handlers.add(handler);
	}

	async stop(): Promise<void> {
		this.handlers.clear();
	}
}
