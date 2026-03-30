import type { Span } from '@opentelemetry/api';

export class SpanRegistry {
	private spans = new Map<string, Span>();

	static workflowKey(executionId: string) {
		return executionId;
	}

	static nodeKey(executionId: string, nodeId: string) {
		return `${executionId}:${nodeId}`;
	}

	addWorkflow(executionId: string, span: Span) {
		this.spans.set(SpanRegistry.workflowKey(executionId), span);
	}

	getWorkflow(executionId: string): Span | undefined {
		return this.spans.get(SpanRegistry.workflowKey(executionId));
	}

	removeWorkflow(executionId: string): Span | undefined {
		const key = SpanRegistry.workflowKey(executionId);
		const span = this.spans.get(key);
		this.spans.delete(key);
		return span;
	}

	addNode(executionId: string, nodeId: string, span: Span) {
		this.spans.set(SpanRegistry.nodeKey(executionId, nodeId), span);
	}

	getNode(executionId: string, nodeId: string): Span | undefined {
		return this.spans.get(SpanRegistry.nodeKey(executionId, nodeId));
	}

	removeNode(executionId: string, nodeId: string): Span | undefined {
		const key = SpanRegistry.nodeKey(executionId, nodeId);
		const span = this.spans.get(key);
		this.spans.delete(key);
		return span;
	}

	cleanup(executionId: string) {
		for (const key of this.spans.keys()) {
			if (key === executionId || key.startsWith(`${executionId}:`)) {
				this.spans.delete(key);
			}
		}
	}
}
