import type { ForwardedChildChunkWire } from '../agent-sse';
import type { PersistedChildTrace } from './types';

export function emptyChildTrace(): PersistedChildTrace {
	return { text: '', reasoningSegments: [], steps: [] };
}

/** Fold one forwarded child chunk into a trace. Mutates `trace` in place so
 *  Vue reactivity is preserved when called on a reactive object. */
export function applyForwardedChildChunk(
	trace: PersistedChildTrace,
	chunk: ForwardedChildChunkWire,
	now: number = Date.now(),
): void {
	switch (chunk.type) {
		case 'text-delta':
			trace.text += chunk.delta;
			break;
		// `reasoning-start` intentionally creates nothing: models that keep their
		// reasoning encrypted (OpenAI, Claude Sonnet 5) emit the lifecycle without
		// ever sending a delta, so a segment opened here would stay empty forever.
		case 'reasoning-delta': {
			let segment = trace.reasoningSegments.find((s) => s.id === chunk.id);
			if (!segment) {
				segment = { id: chunk.id, content: '', startTime: now };
				trace.reasoningSegments.push(segment);
			}
			segment.content += chunk.delta;
			break;
		}
		case 'reasoning-end': {
			const segment = trace.reasoningSegments.find((s) => s.id === chunk.id);
			if (segment) segment.endTime = now;
			break;
		}
		case 'tool-input-start': {
			if (!trace.steps.some((s) => s.toolCallId === chunk.toolCallId)) {
				trace.steps.push({
					toolCallId: chunk.toolCallId,
					toolName: chunk.toolName,
					running: true,
				});
			}
			break;
		}
		case 'tool-execution-start': {
			const step = trace.steps.find((s) => s.toolCallId === chunk.toolCallId);
			if (step) {
				step.running = true;
			} else {
				trace.steps.push({
					toolCallId: chunk.toolCallId,
					toolName: chunk.toolName,
					running: true,
				});
			}
			break;
		}
		case 'tool-execution-end': {
			const step = trace.steps.find((s) => s.toolCallId === chunk.toolCallId);
			if (step) step.running = false;
			break;
		}
		default:
			break;
	}
}

/** Clear residual `running` flags so a settled trace never shows a stuck spinner. */
export function settleChildTrace(trace: PersistedChildTrace): void {
	for (const step of trace.steps) step.running = false;
}
