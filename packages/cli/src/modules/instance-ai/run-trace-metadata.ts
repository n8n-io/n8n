import type { InstanceAiEvent } from '@n8n/api-types';

export type InstanceAiFirstVisibleState =
	| 'assistant_text'
	| 'contextless_hitl'
	| 'tool_call'
	| 'task_card'
	| 'empty';

export type InstanceAiRunTraceMetadataOptions = {
	status: 'completed' | 'cancelled' | 'error';
	cancellationReason?: string;
};

type FirstVisibleSummary = {
	state: InstanceAiFirstVisibleState;
	firstToolName?: string;
};

function withFirstToolName(
	state: InstanceAiFirstVisibleState,
	firstToolName: string | undefined,
): FirstVisibleSummary {
	return firstToolName ? { state, firstToolName } : { state };
}

function getFirstToolName(events: InstanceAiEvent[]): string | undefined {
	for (const event of events) {
		if (event.type === 'tool-call') return event.payload.toolName;
	}

	return undefined;
}

function getFirstVisibleSummary(events: InstanceAiEvent[]): FirstVisibleSummary {
	const firstToolName = getFirstToolName(events);
	let sawToolCall = false;

	for (const event of events) {
		if (event.type === 'tool-call') {
			sawToolCall = true;
			continue;
		}

		if (event.type === 'confirmation-request') {
			return {
				state: 'contextless_hitl',
				firstToolName: firstToolName ?? event.payload.toolName,
			};
		}

		// A streamed segment reaches this read as deltas mid-run and as one
		// coalesced `text-block` once it closes (the durable log never persists
		// deltas), so both spellings have to count as visible assistant text.
		if (
			(event.type === 'text-delta' || event.type === 'text-block') &&
			event.payload.text.trim().length > 0
		) {
			return withFirstToolName('assistant_text', firstToolName);
		}

		if (event.type === 'agent-spawned' || event.type === 'tasks-update') {
			return withFirstToolName('task_card', firstToolName);
		}
	}

	return withFirstToolName(sawToolCall ? 'tool_call' : 'empty', firstToolName);
}

export function buildInstanceAiRunTraceMetadata(
	events: InstanceAiEvent[],
	options: InstanceAiRunTraceMetadataOptions,
): Record<string, unknown> {
	const firstVisible = getFirstVisibleSummary(events);
	const metadata: Record<string, unknown> = {
		first_visible_state: firstVisible.state,
	};

	if (firstVisible.firstToolName) {
		metadata.first_tool_name = firstVisible.firstToolName;
	}

	if (options.status === 'cancelled') {
		metadata.cancellation_type = 'explicit';
	}

	return metadata;
}
