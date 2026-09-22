import type { ExecutionResponse } from '@n8n/engine';
import type { StructuredChunk } from 'n8n-workflow';

import {
	resolveEndedResponse,
	type ResponseStream,
	type WebhookResponseDelivery,
} from '@/services/engine-v2-webhook-response-delivery';
import { PendingWebhookResponse } from '@/services/pending-webhook-response';
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

	handle(published: ExecutionResponse): void {
		switch (published.type) {
			case 'failure':
				this.writeChunk(this.errorChunk(published.error.message));
				this.end();
				this.response.resolve({
					status: 'failed',
					error: { name: published.error.code, message: published.error.message },
				});
				return;

			case 'response':
				return;

			case 'chunk':
				const chunk = published.payload as unknown as StructuredChunk;
				this.writeChunk(chunk);
				if (chunk.type === 'error') this.deliveredError = true;
				return;

			case 'ended':
				if (published.status === 'failed' && !this.deliveredError) {
					this.writeChunk(
						this.errorChunk(
							published.lastStep.error?.message ?? 'Workflow execution failed',
							published.lastStep.nodeId,
							published.lastStep.nodeName,
						),
					);
				}
				this.end();
				resolveEndedResponse(this.response, published);
				return;
		}
	}

	dispose(): void {
		this.heartbeat.stop();
	}

	private writeChunk(chunk: StructuredChunk): void {
		this.stream.write(`${JSON.stringify(chunk)}\n`);
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
