import type { InstanceAiEvent } from '@n8n/api-types';
import type { InstanceAiLivenessTimeoutReason } from '@n8n/instance-ai';

import type { InstanceAiRunTimeoutDetails } from './run-timeout-details';

const RUN_TIMEOUT_REASON = 'timeout';

export type InstanceAiFirstVisibleState =
	| 'assistant_text'
	| 'contextless_hitl'
	| 'tool_call'
	| 'task_card'
	| 'empty';

export type InstanceAiCancellationType = 'explicit' | InstanceAiLivenessTimeoutReason;

export type InstanceAiRunTimeoutTraceContext = {
	timedOut: boolean;
	details?: InstanceAiRunTimeoutDetails;
};

export type InstanceAiRunTraceMetadataOptions = {
	status: 'completed' | 'cancelled' | 'error';
	cancellationReason?: string;
	runTimeout?: InstanceAiRunTimeoutTraceContext;
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

		if (event.type === 'text-delta' && event.payload.text.trim().length > 0) {
			return withFirstToolName('assistant_text', firstToolName);
		}

		if (event.type === 'agent-spawned' || event.type === 'tasks-update') {
			return withFirstToolName('task_card', firstToolName);
		}
	}

	return withFirstToolName(sawToolCall ? 'tool_call' : 'empty', firstToolName);
}

function getCancellationType(
	options: InstanceAiRunTraceMetadataOptions,
): InstanceAiCancellationType | undefined {
	if (options.status !== 'cancelled') return undefined;

	if (options.runTimeout?.timedOut || options.cancellationReason === RUN_TIMEOUT_REASON) {
		return options.runTimeout?.details?.reason ?? 'idle_timeout';
	}

	return 'explicit';
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

	const cancellationType = getCancellationType(options);
	if (cancellationType) {
		metadata.cancellation_type = cancellationType;
	}

	if (options.runTimeout?.details?.idleMs !== undefined) {
		metadata.idle_tail_ms = Math.round(options.runTimeout.details.idleMs);
	}

	return metadata;
}
