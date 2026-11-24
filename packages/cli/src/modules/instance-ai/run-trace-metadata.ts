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

/**
 * What the user could see during a run, in order. Both Assistant runtimes map
 * their own stream to these signals, so their traces carry the same metadata.
 */
export type RunTraceSignal =
	| { kind: 'tool-call'; toolName: string }
	| { kind: 'hitl'; toolName: string }
	| { kind: 'text'; text: string }
	| { kind: 'task-card' };

/** The signal of an event of the current runtime, if the event is visible. */
export function runTraceSignalOf(event: InstanceAiEvent): RunTraceSignal | undefined {
	switch (event.type) {
		case 'tool-call':
			return { kind: 'tool-call', toolName: event.payload.toolName };
		case 'confirmation-request':
			return { kind: 'hitl', toolName: event.payload.toolName };
		// A streamed segment reaches this read as deltas mid-run and as one
		// coalesced `text-block` once it closes (the durable log never persists
		// deltas), so both spellings have to count as visible assistant text.
		case 'text-delta':
		case 'text-block':
			return { kind: 'text', text: event.payload.text };
		case 'agent-spawned':
		case 'tasks-update':
			return { kind: 'task-card' };
		default:
			return undefined;
	}
}

function withFirstToolName(
	state: InstanceAiFirstVisibleState,
	firstToolName: string | undefined,
): FirstVisibleSummary {
	return firstToolName ? { state, firstToolName } : { state };
}

function getFirstToolName(signals: RunTraceSignal[]): string | undefined {
	for (const signal of signals) {
		if (signal.kind === 'tool-call') return signal.toolName;
	}

	return undefined;
}

function getFirstVisibleSummary(signals: RunTraceSignal[]): FirstVisibleSummary {
	const firstToolName = getFirstToolName(signals);
	let sawToolCall = false;

	for (const signal of signals) {
		switch (signal.kind) {
			case 'tool-call':
				sawToolCall = true;
				break;
			case 'hitl':
				return {
					state: 'contextless_hitl',
					firstToolName: firstToolName ?? signal.toolName,
				};
			case 'text':
				if (signal.text.trim().length > 0) {
					return withFirstToolName('assistant_text', firstToolName);
				}
				break;
			case 'task-card':
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
	const signals: RunTraceSignal[] = [];
	for (const event of events) {
		const signal = runTraceSignalOf(event);
		if (signal) signals.push(signal);
	}
	return buildRunTraceMetadata(signals, options);
}

export function buildRunTraceMetadata(
	signals: RunTraceSignal[],
	options: InstanceAiRunTraceMetadataOptions,
): Record<string, unknown> {
	const firstVisible = getFirstVisibleSummary(signals);
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
