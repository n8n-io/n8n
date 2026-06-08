import {
	StreamingRedactor,
	redactText,
	redactDeep,
	type RedactionCategory,
	type RedactionOptions,
} from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';

import type { Logger } from '../logger';

/**
 * Default output-filtering policy for Instance AI: redact known credential/
 * secret patterns plus high-confidence PII. `block`/`warn` strategies are
 * supported by the engine but not yet surfaced here.
 */
export const DEFAULT_OUTPUT_REDACTION_OPTIONS: RedactionOptions = {
	secrets: true,
	detect: ['email', 'credit-card', 'ssn'],
};

interface OutputRedactorContext {
	logger: Logger;
	threadId: string;
	runId: string;
	agentId: string;
	options?: RedactionOptions;
}

type DeltaType = 'text-delta' | 'reasoning-delta';

interface Channel {
	readonly type: DeltaType;
	readonly redactor: StreamingRedactor;
	responseId?: string;
}

/**
 * Scans agent output events for secrets/PII before they reach the user and
 * redacts matches in place.
 *
 * Text/reasoning deltas are streamed through a holdback-buffered redactor so a
 * secret split across chunk boundaries is caught. Buffered text is released
 * (with its original `responseId`) whenever a structural event (tool call,
 * result, …) or a new step boundary arrives — secrets never span those
 * boundaries — so event ordering and step grouping are preserved. Tool
 * results/errors are redacted one-shot.
 *
 * One instance per run. Call {@link processEvent} on each mapped event; it
 * returns the ordered events to publish. Call {@link flush} when the active
 * stream segment ends to release any remainder and log a filtering summary.
 */
export class OutputRedactor {
	private readonly options: RedactionOptions;

	private readonly text: Channel;

	private readonly reasoning: Channel;

	private matches: RedactionCategory[] = [];

	constructor(private readonly context: OutputRedactorContext) {
		this.options = context.options ?? DEFAULT_OUTPUT_REDACTION_OPTIONS;
		this.text = { type: 'text-delta', redactor: new StreamingRedactor(this.options) };
		this.reasoning = { type: 'reasoning-delta', redactor: new StreamingRedactor(this.options) };
	}

	/** Redact an outgoing event; returns the ordered events that should be published. */
	processEvent(event: InstanceAiEvent): InstanceAiEvent[] {
		if (event.type === 'text-delta') return this.processDelta(event, this.text);
		if (event.type === 'reasoning-delta') return this.processDelta(event, this.reasoning);

		// Structural event: release any buffered text first so ordering is kept.
		return [
			...this.drainChannel(this.reasoning),
			...this.drainChannel(this.text),
			this.redactStructural(event),
		];
	}

	/** Release buffered text for both channels and log a filtering summary. Call at segment end. */
	flush(): InstanceAiEvent[] {
		const events = [...this.drainChannel(this.reasoning), ...this.drainChannel(this.text)];
		this.logSummary();
		return events;
	}

	private processDelta(
		event: Extract<InstanceAiEvent, { type: DeltaType }>,
		channel: Channel,
	): InstanceAiEvent[] {
		const events: InstanceAiEvent[] = [];
		// A new step: release the previous step's text under its own responseId.
		if (channel.responseId !== undefined && channel.responseId !== event.responseId) {
			events.push(...this.drainChannel(channel));
		}
		channel.responseId = event.responseId;

		const { text, matches } = channel.redactor.push(event.payload.text);
		this.recordMatches(matches);
		if (text) events.push(this.makeDelta(channel, text));
		return events;
	}

	private drainChannel(channel: Channel): InstanceAiEvent[] {
		const { text, matches } = channel.redactor.flush();
		this.recordMatches(matches);
		return text ? [this.makeDelta(channel, text)] : [];
	}

	private makeDelta(channel: Channel, text: string): InstanceAiEvent {
		return {
			type: channel.type,
			runId: this.context.runId,
			agentId: this.context.agentId,
			...(channel.responseId ? { responseId: channel.responseId } : {}),
			payload: { text },
		};
	}

	private redactStructural(event: InstanceAiEvent): InstanceAiEvent {
		if (event.type === 'tool-result') {
			const { value, matches } = redactDeep(event.payload.result, this.options);
			this.recordMatches(matches);
			return { ...event, payload: { ...event.payload, result: value } };
		}
		if (event.type === 'tool-error') {
			const { text, matches } = redactText(event.payload.error, this.options);
			this.recordMatches(matches);
			return { ...event, payload: { ...event.payload, error: text } };
		}
		return event;
	}

	private recordMatches(matches: Array<{ category: RedactionCategory }>): void {
		for (const match of matches) this.matches.push(match.category);
	}

	/** Emit a single filtering-event log per segment — categories and counts only, never values. */
	private logSummary(): void {
		if (this.matches.length === 0) return;
		const categories: Partial<Record<RedactionCategory, number>> = {};
		for (const category of this.matches) {
			categories[category] = (categories[category] ?? 0) + 1;
		}
		this.context.logger.info('Instance AI redacted sensitive content from agent output', {
			threadId: this.context.threadId,
			runId: this.context.runId,
			agentId: this.context.agentId,
			count: this.matches.length,
			categories,
		});
		this.matches = [];
	}
}
