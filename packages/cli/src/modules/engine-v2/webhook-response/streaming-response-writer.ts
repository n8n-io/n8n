import type { JsonValue } from '@n8n/engine';
import type { StructuredChunk } from 'n8n-workflow';

import {
	type ResponseStream,
	StreamingWebhookResponseHeartbeat,
} from '@/webhooks/streaming-webhook-response-heartbeat';

import type { WebhookRunOutcome } from './webhook-outcome';

/**
 * Writes the NDJSON chunks of one run to its streaming webhook response. It
 * keeps the stream open with a heartbeat, and it ends the stream when the run
 * settles.
 *
 * It only writes. The response registry decides when the run is over, and
 * when the writer stops.
 */
export class StreamingResponseWriter {
	private deliveredError = false;

	private stopped = false;

	private readonly heartbeat: StreamingWebhookResponseHeartbeat;

	constructor(private readonly stream: ResponseStream) {
		this.heartbeat = new StreamingWebhookResponseHeartbeat(stream);
	}

	writeChunk(payload: JsonValue): void {
		if (this.stopped) return;

		// The payload is opaque on the channel. Only this plane knows the v1 chunk.
		const chunk = payload as unknown as StructuredChunk;
		this.write(chunk);
		if (chunk.type === 'error') this.deliveredError = true;
	}

	/** Writes what the outcome needs the caller to know, and ends the stream. */
	finish(outcome: WebhookRunOutcome): void {
		if (this.stopped) return;

		if (outcome.status === 'undeliverable') {
			this.write(this.errorChunk(outcome.error.message));
		}

		if (outcome.status === 'timeout') {
			// Timeout chunk to tell a cut-off stream apart from a complete one.
			this.write(this.errorChunk('Workflow execution timed out'));
		}

		if (outcome.status === 'failed' && !this.deliveredError) {
			// The error message can hold request details, so the caller gets a
			// generic text. The non-streaming modes do the same.
			this.write(this.errorChunk('Workflow execution failed', outcome.nodeId, outcome.nodeName));
		}

		this.stop();
		if (!this.stream.writableEnded) this.stream.end();
	}

	/**
	 * Stops the writes and the heartbeat, but leaves the stream open. The caller
	 * that gives up on the run decides how the request ends.
	 */
	stop(): void {
		if (this.stopped) return;
		this.stopped = true;
		this.heartbeat.stop();
	}

	private write(chunk: StructuredChunk): void {
		this.stream.write(`${JSON.stringify(chunk)}\n`);
		// The compression middleware buffers writes until it is flushed.
		this.stream.flush?.();
	}

	private errorChunk(content: string, nodeId = 'unknown', nodeName = 'unknown'): StructuredChunk {
		return {
			type: 'error',
			content,
			metadata: { nodeId, nodeName, runIndex: 0, itemIndex: 0, timestamp: Date.now() },
		};
	}
}
