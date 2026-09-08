import type { InstanceAiEvent } from '@n8n/api-types';

import type { InstanceAiEventBus } from '../event-bus/event-bus.interface';
import type { Logger } from '../logger';
import {
	executeResumableStream,
	normalizeStreamSource,
} from '../runtime/resumable-stream-executor';
import type { RunTokenUsage } from '../stream/usage-accumulator';
import type { WorkSummary } from '../stream/work-summary-accumulator';
import type { SuspensionInfo } from '../utils/stream-helpers';

type ConfirmationRequestEvent = Extract<InstanceAiEvent, { type: 'confirmation-request' }>;

export interface ConsumeStreamCascadingOptions {
	agent: unknown;
	stream: unknown;
	runId: string;
	agentId: string;
	eventBus: InstanceAiEventBus;
	logger: Logger;
	threadId: string;
	abortSignal: AbortSignal;
}

export type ConsumeStreamCascadingResult =
	| {
			status: 'completed' | 'cancelled' | 'errored';
			agentRunId: string;
			text: Promise<string>;
			workSummary: WorkSummary;
			usage?: RunTokenUsage;
	  }
	| {
			status: 'suspended';
			agentRunId: string;
			suspension: SuspensionInfo;
			confirmationEvent?: ConfirmationRequestEvent;
			text?: Promise<string>;
			workSummary: WorkSummary;
			usage?: RunTokenUsage;
	  };

/**
 * Consume a sub-agent stream and return cleanly when it either finishes or
 * hits a HITL suspension. This returns the suspension info to the caller so it can decide
 * how to handle it — e.g. cascade the suspension up to its own SDK suspend
 * via `ctx.suspend(payload)`, so the parent's agent run is also checkpointed
 * and survives a process restart.
 *
 * Uses `executeResumableStream`'s manual mode, which suppresses the
 * sub-agent's `confirmation-request` event publish (returning it on the
 * result instead) — the caller emits the card at whatever runId is
 * meaningful at its level.
 */
export async function consumeStreamCascading(
	options: ConsumeStreamCascadingOptions,
): Promise<ConsumeStreamCascadingResult> {
	const stream = normalizeStreamSource(options.stream);
	const result = await executeResumableStream({
		agent: options.agent,
		stream,
		context: {
			threadId: options.threadId,
			runId: options.runId,
			agentId: options.agentId,
			eventBus: options.eventBus,
			signal: options.abortSignal,
			logger: options.logger,
		},
		control: { mode: 'manual' },
	});

	if (result.status === 'suspended' && result.suspension) {
		return {
			status: 'suspended',
			agentRunId: result.agentRunId,
			suspension: result.suspension,
			...(result.confirmationEvent ? { confirmationEvent: result.confirmationEvent } : {}),
			...(result.text ? { text: result.text } : {}),
			workSummary: result.workSummary,
			...(result.usage ? { usage: result.usage } : {}),
		};
	}

	return {
		status: result.status === 'suspended' ? 'errored' : result.status,
		agentRunId: result.agentRunId,
		text: result.text ?? stream.text ?? Promise.resolve(''),
		workSummary: result.workSummary,
		...(result.usage ? { usage: result.usage } : {}),
	};
}
