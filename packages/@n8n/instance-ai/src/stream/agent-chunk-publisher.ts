import { isFinishReason } from '@n8n/agents';
import type { FinishReason } from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { randomUUID } from 'node:crypto';

import type { InstanceAiEventBus } from '../event-bus';
import { isQuotaExhaustedError, mapAgentChunkToEvent } from './map-chunk';
import { UsageAccumulator, type RunTokenUsage } from './usage-accumulator';
import { WorkSummaryAccumulator, type WorkSummary } from './work-summary-accumulator';
import { parseSuspension, type SuspensionInfo } from '../utils/stream-helpers';

type ConfirmationRequestEvent = Extract<InstanceAiEvent, { type: 'confirmation-request' }>;

export interface AgentChunkPublisherOptions {
	threadId: string;
	runId: string;
	agentId: string;
	eventBus: InstanceAiEventBus;
	/** Called after each chunk is published. Return true to stop the turn early. */
	shouldStop?: () => boolean;
	onStop?: () => void;
}

export interface AgentChunkPublisherResult {
	text: string;
	error?: unknown;
	hasError: boolean;
	finishReason?: FinishReason;
	suspension?: SuspensionInfo;
	confirmationEvent?: ConfirmationRequestEvent;
	workSummary: WorkSummary;
	usage?: RunTokenUsage;
	stopped: boolean;
}

/**
 * Maps the chunks of one Agents-runtime turn to `InstanceAiEvent`s and
 * publishes them. The host runtime owns the stream and the suspend and resume
 * cycle. This class only translates, and it collects what the post-turn logic
 * needs: text, usage, the work summary and the first suspension.
 *
 * The primary confirmation card is held back until `flushConfirmation()`, so
 * the client sees it only after the checkpoint and the execution are stored.
 */
export class AgentChunkPublisher {
	private readonly usage = new UsageAccumulator();

	private readonly work = new WorkSummaryAccumulator();

	private text = '';

	private hasError = false;

	private error: unknown;

	private quotaErrorPublished = false;

	private finishReason?: FinishReason;

	private suspension?: SuspensionInfo;

	private confirmationEvent?: ConfirmationRequestEvent;

	private stopped = false;

	private stepIndex = 0;

	private currentResponseId?: string;

	private syntheticSegmentId?: string;

	constructor(private readonly options: AgentChunkPublisherOptions) {}

	observe(chunk: unknown): void {
		this.usage.observe(chunk);
		if (this.stopped) return;
		if (!isRecord(chunk)) return;

		if (chunk.type === 'finish' && isFinishReason(chunk.finishReason)) {
			this.finishReason = chunk.finishReason;
		}
		if (chunk.type === 'text-delta' && typeof chunk.delta === 'string') {
			this.text += chunk.delta;
		}
		if (chunk.type === 'start-step') {
			this.stepIndex += 1;
			this.currentResponseId = `${this.options.runId}:step:${this.stepIndex}`;
			this.syntheticSegmentId = undefined;
		}

		const parsedSuspension = parseSuspension(chunk);
		if (parsedSuspension && !this.suspension) this.suspension = parsedSuspension;

		if (chunk.type === 'error') {
			this.hasError = true;
			if (this.quotaErrorPublished) return;
			this.error = chunk.error;
			if (isQuotaExhaustedError(chunk.error)) this.quotaErrorPublished = true;
		}

		const isDeltaChunk = chunk.type === 'text-delta' || chunk.type === 'reasoning-delta';
		if (isDeltaChunk && !this.currentResponseId && !this.syntheticSegmentId) {
			this.syntheticSegmentId = `${this.options.runId}:seg:${randomUUID()}`;
		}
		const event = mapAgentChunkToEvent(
			this.options.runId,
			this.options.agentId,
			chunk,
			this.currentResponseId ?? this.syntheticSegmentId,
		);
		if ((event && !isDeltaChunk) || chunk.type === 'finish-step') {
			this.syntheticSegmentId = undefined;
		}

		if (event) {
			this.work.observe(event);
			if (event.type !== 'confirmation-request') {
				this.options.eventBus.publish(this.options.threadId, event);
			} else if (this.isPrimaryConfirmation(event)) {
				// Later distinct suspensions wait until this one is answered.
				this.confirmationEvent = event;
			}
		}

		if (this.options.shouldStop?.()) {
			this.stopped = true;
			this.options.onStop?.();
		}
	}

	/** Publish the held-back confirmation card. */
	flushConfirmation(): ConfirmationRequestEvent | undefined {
		const event = this.confirmationEvent;
		if (event) this.options.eventBus.publish(this.options.threadId, event);
		return event;
	}

	result(): AgentChunkPublisherResult {
		return {
			text: this.text,
			hasError: this.hasError,
			...(this.error !== undefined ? { error: this.error } : {}),
			finishReason: this.finishReason,
			suspension: this.suspension,
			confirmationEvent: this.confirmationEvent,
			workSummary: this.work.toSummary(),
			usage: this.usage.hasUsage() ? this.usage.toUsage() : undefined,
			stopped: this.stopped,
		};
	}

	private isPrimaryConfirmation(event: ConfirmationRequestEvent): boolean {
		return (
			this.confirmationEvent === undefined &&
			event.payload.requestId === this.suspension?.requestId &&
			event.payload.toolCallId === this.suspension?.toolCallId
		);
	}
}
