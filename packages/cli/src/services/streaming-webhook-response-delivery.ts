import type { ExecutionResponse } from '@n8n/engine';
import type { StructuredChunk } from 'n8n-workflow';

import {
	resolveEndedResponse,
	resolveUndeliverableResponse,
	type ResponseStream,
	type WebhookResponseDelivery,
} from '@/services/engine-v2-webhook-response-delivery';
import type { PendingWebhookResponse } from '@/services/pending-webhook-response';
import { StreamingWebhookResponseHeartbeat } from '@/services/streaming-webhook-response-heartbeat';

/** Delivers NDJSON chunks and owns the lifecycle of a streaming webhook response. */
export class StreamingWebhookResponseDelivery implements WebhookResponseDelivery {
	private deliveredError = false;

	private ended = false;

	private readonly heartbeat: StreamingWebhookResponseHeartbeat;

	constructor(
		private readonly response: PendingWebhookResponse,
		private readonly stream: ResponseStream,
	) {
		this.heartbeat = new StreamingWebhookResponseHeartbeat(stream);
	}

	handle(received: ExecutionResponse): void {
		switch (received.type) {
			case 'undeliverable':
				this.writeChunk(this.errorChunk(received.error.message));
				this.end();
				resolveUndeliverableResponse(this.response, received);
				return;

			case 'response':
				// A streaming request is answered by its chunks only.
				return;

			case 'chunk': {
				// The payload is opaque on the channel. Only this plane knows the v1 chunk.
				const chunk = received.payload as unknown as StructuredChunk;
				this.writeChunk(chunk);
				if (chunk.type === 'error') this.deliveredError = true;
				return;
			}

			case 'ended':
				if (received.status === 'failed' && !this.deliveredError) {
					this.writeChunk(
						this.errorChunk(
							received.lastStep.error?.message ?? 'Workflow execution failed',
							received.lastStep.nodeId,
							received.lastStep.nodeName,
						),
					);
				}
				this.end();
				resolveEndedResponse(this.response, received);
				return;
		}
	}

	dispose(): void {
		this.heartbeat.stop();
	}

	private writeChunk(chunk: StructuredChunk): void {
		this.stream.write(`${JSON.stringify(chunk)}\n`);
		// The compression middleware buffers writes until it is flushed.
		this.stream.flush?.();
	}

	private end(): void {
		if (this.ended) return;
		this.ended = true;
		this.heartbeat.stop();
		this.stream.end();
	}

	private errorChunk(content: string, nodeId = 'unknown', nodeName = 'unknown'): StructuredChunk {
		return {
			type: 'error',
			content,
			metadata: { nodeId, nodeName, runIndex: 0, itemIndex: 0, timestamp: Date.now() },
		};
	}
}
