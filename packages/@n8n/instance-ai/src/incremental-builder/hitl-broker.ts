/**
 * Human-in-the-loop broker for the incremental builder.
 *
 * Tools and the executor call `requestChoice(...)` to pause and surface a
 * question to the user. The controller (REST endpoint that receives the
 * user's reply) calls `resolve(requestId, response)` to release the
 * pending promise.
 *
 * Emits a synthetic tool-call before the confirmation-request and a
 * tool-result after — that way the frontend's agent tree has a tool node
 * to attach the confirmation to, and `AnsweredQuestions.vue` receives the
 * answer in the canonical shape (questionId / selectedOptions / customText /
 * skipped) so the chat bubble renders correctly.
 */

import type {
	AgentId,
	InstanceAiConfirmationRequestPayload,
	InstanceAiEvent,
	RunId,
	ToolCallId,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';

import type { InstanceAiEventBus } from '../event-bus';

interface PendingEntry {
	resolve: (response: HitlResponse) => void;
	options: HitlChoiceOption[];
	toolCallId: string;
}

export interface HitlChoiceOption {
	id: string;
	label: string;
}

export interface HitlChoiceRequest {
	question: string;
	intro?: string;
	options: HitlChoiceOption[];
	allowFreeText?: boolean;
	severity?: 'info' | 'warning' | 'destructive';
}

export interface HitlResponse {
	requestId: string;
	choiceId?: string;
	freeText?: string;
	cancelled?: boolean;
}

export interface HitlBrokerOptions {
	threadId: string;
	runId: string;
	agentId: string;
	userId?: string;
	eventBus: InstanceAiEventBus;
	timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export class HitlBroker {
	private readonly threadId: string;

	private readonly runId: string;

	private readonly agentId: string;

	private readonly userId?: string;

	private readonly eventBus: InstanceAiEventBus;

	private readonly timeoutMs: number;

	private readonly pending = new Map<string, PendingEntry>();

	constructor(opts: HitlBrokerOptions) {
		this.threadId = opts.threadId;
		this.runId = opts.runId;
		this.agentId = opts.agentId;
		this.userId = opts.userId;
		this.eventBus = opts.eventBus;
		this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	}

	async requestChoice(req: HitlChoiceRequest): Promise<HitlResponse> {
		const requestId = `hitl_${nanoid(10)}`;
		const toolCallId = `inc_${nanoid(8)}` as ToolCallId;
		const args = {
			question: req.question,
			options: req.options.map((o) => o.label),
			allowFreeText: req.allowFreeText ?? false,
		};

		// 1) Emit a synthetic tool-call so the frontend agent tree has a tool
		//    node to attach the confirmation to (without this, the
		//    confirmation-request can't surface in InstanceAiConfirmationPanel).
		const toolCallEvent: InstanceAiEvent = {
			type: 'tool-call',
			runId: this.runId as RunId,
			agentId: this.agentId as AgentId,
			...(this.userId !== undefined && { userId: this.userId }),
			payload: { toolCallId, toolName: 'ask_user_choice', args },
		};
		this.eventBus.publish(this.threadId, toolCallEvent);

		// 2) Emit the confirmation-request bound to that toolCallId.
		const payload: InstanceAiConfirmationRequestPayload = {
			requestId,
			toolCallId,
			toolName: 'ask_user_choice',
			args,
			severity: req.severity ?? 'info',
			message: req.question,
			inputType: 'questions',
			...(req.intro !== undefined && { introMessage: req.intro }),
			questions: [
				{
					id: 'choice',
					question: req.question,
					// Always render as single-select so the user gets concrete options
					// plus the inline "Something else" free-text row. Falling back to
					// a plain textarea forces the user to articulate from scratch even
					// when good defaults are available.
					type: 'single',
					options: req.options.map((o) => o.label),
				},
			],
		};

		const confirmEvent: InstanceAiEvent = {
			type: 'confirmation-request',
			runId: this.runId as RunId,
			agentId: this.agentId as AgentId,
			...(this.userId !== undefined && { userId: this.userId }),
			payload,
		};

		const promise = new Promise<HitlResponse>((resolve) => {
			this.pending.set(requestId, { resolve, options: req.options, toolCallId });
		});

		this.eventBus.publish(this.threadId, confirmEvent);

		// Soft timeout — fall through with cancelled response if the user never replies.
		const timer = setTimeout(() => {
			const entry = this.pending.get(requestId);
			if (entry) {
				this.pending.delete(requestId);
				entry.resolve({ requestId, cancelled: true });
			}
		}, this.timeoutMs);

		const result = await promise;
		clearTimeout(timer);

		// 3) Settle the tool call. AnsweredQuestions.vue reads
		//    result.answers[i].{selectedOptions,customText,skipped} — match that
		//    shape exactly so the chat bubble shows the real reply, not "Skipped".
		const matchingOption = result.choiceId
			? req.options.find((o) => o.id === result.choiceId)
			: undefined;
		const selectedOptions: string[] = matchingOption ? [matchingOption.label] : [];
		const customText = result.freeText ?? '';
		const skipped =
			result.cancelled === true || (selectedOptions.length === 0 && !customText.trim());

		const settle: InstanceAiEvent = {
			type: 'tool-result',
			runId: this.runId as RunId,
			agentId: this.agentId as AgentId,
			...(this.userId !== undefined && { userId: this.userId }),
			payload: {
				toolCallId,
				result: {
					answered: !skipped,
					answers: [
						{
							questionId: 'choice',
							selectedOptions,
							customText,
							skipped,
						},
					],
				},
			},
		};
		this.eventBus.publish(this.threadId, settle);

		return result;
	}

	/**
	 * Resolve a pending request. Accepts either the raw `choiceId` or a
	 * `selectedLabel` (the controller delivers labels from the SSE Q&A payload);
	 * the broker reverse-looks-up the matching option.
	 */
	resolve(
		requestId: string,
		response: {
			choiceId?: string;
			selectedLabel?: string;
			freeText?: string;
			cancelled?: boolean;
		},
	): boolean {
		const entry = this.pending.get(requestId);
		if (!entry) return false;
		this.pending.delete(requestId);

		let choiceId = response.choiceId;
		if (!choiceId && response.selectedLabel) {
			const match = entry.options.find((o) => o.label === response.selectedLabel);
			if (match) choiceId = match.id;
		}

		entry.resolve({
			requestId,
			...(choiceId !== undefined && { choiceId }),
			...(response.freeText !== undefined && { freeText: response.freeText }),
			...(response.cancelled !== undefined && { cancelled: response.cancelled }),
		});
		return true;
	}

	hasPending(requestId: string): boolean {
		return this.pending.has(requestId);
	}

	cancelAll(): void {
		for (const [requestId, entry] of this.pending.entries()) {
			entry.resolve({ requestId, cancelled: true });
		}
		this.pending.clear();
	}
}
