import {
	StreamingRedactor,
	redactText,
	redactDeep,
	type RedactionCategory,
	type RedactionOptions,
} from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';
import { isRecord } from '@n8n/utils';

import type { Logger } from '../logger';

/**
 * Default output-filtering policy for Instance AI: redact known credential/
 * secret patterns plus credit-card numbers. Other PII categories (`email`,
 * `ssn-us`) are implemented but off by default until we decide which to enable.
 *
 * Instance AI always redacts matches. The SDK's `GuardrailStrategy` also defines
 * `block` and `warn`, but those are not implemented here.
 */
export const DEFAULT_OUTPUT_REDACTION_OPTIONS: RedactionOptions = {
	secrets: true,
	detect: ['credit-card'],
};

interface OutputRedactorContext {
	logger: Logger;
	threadId: string;
	runId: string;
	agentId: string;
	/**
	 * Redaction policy: omit for the safe default, pass options to customise, or
	 * `false` to disable scanning entirely (events pass through untouched).
	 */
	options?: RedactionOptions | false;
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
	private readonly enabled: boolean;

	private readonly options: RedactionOptions;

	private readonly text: Channel;

	private readonly reasoning: Channel;

	private matches: RedactionCategory[] = [];

	constructor(private readonly context: OutputRedactorContext) {
		this.enabled = context.options !== false;
		// When disabled the options are unused; default keeps the type concrete.
		this.options =
			context.options === false || context.options === undefined
				? DEFAULT_OUTPUT_REDACTION_OPTIONS
				: context.options;
		this.text = { type: 'text-delta', redactor: new StreamingRedactor(this.options) };
		this.reasoning = { type: 'reasoning-delta', redactor: new StreamingRedactor(this.options) };
	}

	/** Redact an outgoing event; returns the ordered events that should be published. */
	processEvent(event: InstanceAiEvent): InstanceAiEvent[] {
		if (!this.enabled) return [event];
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
		if (!this.enabled) return [];
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
		if (event.type === 'tool-call') {
			// Redact the model-generated args shown in the UI. This only touches the
			// event payload, not the actual tool invocation (handled by the runtime).
			const { value, matches } = redactDeep(event.payload.args, this.options);
			this.recordMatches(matches);
			return {
				...event,
				payload: { ...event.payload, args: isRecord(value) ? value : event.payload.args },
			};
		}
		if (event.type === 'tool-result') {
			const { value, matches } = redactDeep(event.payload.result, this.options);
			this.recordMatches(matches);
			return { ...event, payload: { ...event.payload, result: value } };
		}
		if (event.type === 'tool-error') {
			return {
				...event,
				payload: { ...event.payload, error: this.redactString(event.payload.error) },
			};
		}
		if (event.type === 'confirmation-request') {
			return this.redactConfirmation(event);
		}
		return event;
	}

	/**
	 * Redact the human-readable text of a HITL confirmation card (message, intro,
	 * question/option labels, and task/plan-item descriptions). Control and
	 * identifier fields — `requestId`, `toolCallId`, `inputType`,
	 * `credentialRequests`, task `id`/`status`, plan `kind`/`deps`, etc. — are
	 * left untouched so suspend/resume routing keeps working.
	 */
	private redactConfirmation(
		event: Extract<InstanceAiEvent, { type: 'confirmation-request' }>,
	): InstanceAiEvent {
		const payload = event.payload;
		const questions = payload.questions?.map((question) => ({
			...question,
			question: this.redactString(question.question),
			...(question.options ? { options: question.options.map((o) => this.redactString(o)) } : {}),
		}));

		const tasks = payload.tasks
			? {
					...payload.tasks,
					tasks: payload.tasks.tasks.map((task) => ({
						...task,
						description: this.redactString(task.description),
						...(task.detail ? { detail: this.redactString(task.detail) } : {}),
					})),
				}
			: undefined;

		const planItems = payload.planItems?.map((item) => ({
			...item,
			title: this.redactString(item.title),
			spec: this.redactString(item.spec),
		}));

		return {
			...event,
			payload: {
				...payload,
				message: this.redactString(payload.message),
				...(payload.introMessage ? { introMessage: this.redactString(payload.introMessage) } : {}),
				...(questions ? { questions } : {}),
				...(tasks ? { tasks } : {}),
				...(planItems ? { planItems } : {}),
			},
		};
	}

	private redactString(text: string): string {
		const { text: redacted, matches } = redactText(text, this.options);
		this.recordMatches(matches);
		return redacted;
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
