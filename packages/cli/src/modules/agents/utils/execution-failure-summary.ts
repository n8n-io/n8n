import { isRecord } from '@n8n/utils/is-record';

import type { TimelineEvent } from '../execution-recorder';

export type AgentExecutionFailureKind = 'execution' | 'tool' | 'node' | 'workflow';

export interface AgentExecutionFailure {
	kind: AgentExecutionFailureKind;
	name: string | null;
	message: string | null;
	occurredAt: number;
}

export interface AgentExecutionFailureSummary {
	count: number;
	latest: AgentExecutionFailure;
}

export interface ThreadFailureSummary extends AgentExecutionFailureSummary {
	latest: AgentExecutionFailure & { executionId: string };
}

const MAX_FAILURE_MESSAGE_LENGTH = 400;

function failureMessage(output: unknown): string | null {
	if (!isRecord(output) || typeof output.error !== 'string') return null;
	const message = output.error.trim();
	return message ? message.slice(0, MAX_FAILURE_MESSAGE_LENGTH) : null;
}

function isDeclinedToolOutput(output: unknown): boolean {
	return isRecord(output) && output.declined === true;
}

function isWorkflowSoftFailure(event: Extract<TimelineEvent, { type: 'tool-call' }>): boolean {
	return event.kind === 'workflow' && isRecord(event.output) && event.output.status === 'error';
}

export function computeExecutionFailureSummary({
	timeline,
	status,
	error,
	stoppedAt,
}: {
	timeline: TimelineEvent[];
	status: 'running' | 'success' | 'error' | 'cancelled' | 'interrupted';
	error: string | null;
	stoppedAt: number;
}): AgentExecutionFailureSummary | null {
	let count = 0;
	let latest: AgentExecutionFailure | null = null;

	const addFailure = (failure: AgentExecutionFailure) => {
		count++;
		if (latest === null || failure.occurredAt >= latest.occurredAt) latest = failure;
	};

	for (const event of timeline) {
		if (
			event.type !== 'tool-call' ||
			event.endTime === 0 ||
			isDeclinedToolOutput(event.output) ||
			(event.success && !isWorkflowSoftFailure(event))
		) {
			continue;
		}

		addFailure({
			kind: event.kind,
			name: event.nodeDisplayName ?? event.workflowName ?? event.name,
			message: failureMessage(event.output),
			occurredAt: event.endTime,
		});
	}

	if (status === 'error' || status === 'interrupted') {
		const message = error?.trim();
		addFailure({
			kind: 'execution',
			name: null,
			message: message ? message.slice(0, MAX_FAILURE_MESSAGE_LENGTH) : null,
			occurredAt: stoppedAt,
		});
	}

	return latest ? { count, latest } : null;
}
