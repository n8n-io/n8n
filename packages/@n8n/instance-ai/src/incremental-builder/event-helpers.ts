/**
 * Tiny helpers for publishing the non-store incremental events
 * (phase / scope / verifier-report). Keeps the wire shape in one place.
 */

import type {
	AgentId,
	IncPhase,
	IncScopeSpec,
	IncVerifierReport,
	InstanceAiEvent,
	RunId,
} from '@n8n/api-types';

import type { InstanceAiEventBus } from '../event-bus';

export interface EventChannel {
	threadId: string;
	runId: string;
	agentId: string;
	userId?: string;
	eventBus: InstanceAiEventBus;
}

const base = (channel: EventChannel) => ({
	runId: channel.runId as RunId,
	agentId: channel.agentId as AgentId,
	...(channel.userId !== undefined && { userId: channel.userId }),
});

export function publishPhase(channel: EventChannel, phase: IncPhase, message?: string): void {
	const event: InstanceAiEvent = {
		type: 'inc-phase-update',
		...base(channel),
		payload: { phase, ...(message !== undefined && { message }) },
	};
	channel.eventBus.publish(channel.threadId, event);
}

export function publishScope(
	channel: EventChannel,
	scope: IncScopeSpec,
	stage: 'proposed' | 'confirmed',
): void {
	const event: InstanceAiEvent = {
		type: 'inc-scope-update',
		...base(channel),
		payload: { scope, stage },
	};
	channel.eventBus.publish(channel.threadId, event);
}

export function publishVerifierReport(channel: EventChannel, report: IncVerifierReport): void {
	const event: InstanceAiEvent = {
		type: 'inc-verifier-report',
		...base(channel),
		payload: report,
	};
	channel.eventBus.publish(channel.threadId, event);
}

export function publishStatus(channel: EventChannel, message: string): void {
	const event: InstanceAiEvent = {
		type: 'status',
		...base(channel),
		payload: { message },
	};
	channel.eventBus.publish(channel.threadId, event);
}
