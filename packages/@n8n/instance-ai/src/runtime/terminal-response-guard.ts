import {
	isDisplayableConfirmationRequest,
	type InstanceAiConfirmationRequestEvent,
	type InstanceAiEvent,
} from '@n8n/api-types';

import type { WorkSummary } from '../stream/work-summary-accumulator';

export type TerminalResponseStatus = 'completed' | 'cancelled' | 'errored' | 'waiting';

export type TerminalVisibilitySource =
	| 'root-text'
	| 'root-error'
	| 'confirmation-ui'
	| 'fallback'
	| 'none';

export interface TerminalResponseGuardOptions {
	runId: string;
	rootAgentId: string;
	messageGroupId?: string;
	correlationId?: string;
}

export interface TerminalResponseDecision {
	status: TerminalResponseStatus;
	visibilitySource: TerminalVisibilitySource;
	action: 'none' | 'emit';
	reason:
		| 'already-visible'
		| 'already-emitted'
		| 'completed-silent'
		| 'cancelled-silent'
		| 'errored-silent'
		| 'errored-after-text'
		| 'completed-after-error'
		| 'confirmation-visible'
		| 'confirmation-invalid';
	event?: InstanceAiEvent;
}

const FALLBACK_RESPONSE_PREFIX = 'terminal-fallback';

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
	return count === 1 ? singular : plural;
}

function formatWorkSummaryCounts(workSummary?: WorkSummary): string {
	if (!workSummary || workSummary.totalToolCalls === 0) return '';

	const toolText = `${workSummary.totalToolCalls} ${pluralize(workSummary.totalToolCalls, 'tool')}`;
	if (workSummary.totalToolErrors === 0) return ` I ran ${toolText}.`;

	return ` I ran ${toolText}; ${workSummary.totalToolErrors} ${pluralize(
		workSummary.totalToolErrors,
		'tool',
	)} errored.`;
}

function hasText(event: InstanceAiEvent): boolean {
	return event.type === 'text-delta' && event.payload.text.trim().length > 0;
}

export class InstanceAiTerminalResponseGuard {
	constructor(private readonly options: TerminalResponseGuardOptions) {}

	evaluateTerminal(
		events: InstanceAiEvent[],
		status: Exclude<TerminalResponseStatus, 'waiting'>,
		options: { workSummary?: WorkSummary; errorMessage?: string } = {},
	): TerminalResponseDecision {
		const visibility = this.getVisibility(events);
		if (visibility.hasCurrentRunFallback) {
			return {
				status,
				visibilitySource: 'fallback',
				action: 'none',
				reason: 'already-emitted',
			};
		}

		if (status === 'completed') {
			if (visibility.hasRootError) {
				return {
					status,
					visibilitySource: 'root-error',
					action: 'none',
					reason: 'completed-after-error',
				};
			}
			if (visibility.hasRootText) {
				return {
					status,
					visibilitySource: 'root-text',
					action: 'none',
					reason: 'already-visible',
				};
			}
			return this.emitText(
				status,
				'completed-silent',
				`I finished the run, but I did not generate a final response.${formatWorkSummaryCounts(
					options.workSummary,
				)}`,
			);
		}

		if (status === 'cancelled') {
			if (visibility.hasRootText || visibility.hasRootError) {
				return {
					status,
					visibilitySource: visibility.hasRootError ? 'root-error' : 'root-text',
					action: 'none',
					reason: 'already-visible',
				};
			}
			return this.emitText(
				status,
				'cancelled-silent',
				'The run was cancelled before I could send a response.',
			);
		}

		if (visibility.hasRootError) {
			return {
				status,
				visibilitySource: 'root-error',
				action: 'none',
				reason: 'already-visible',
			};
		}

		return this.emitError(
			status,
			visibility.hasRootText ? 'errored-after-text' : 'errored-silent',
			options.errorMessage ??
				'I hit an error before I could finish that response. Please try again.',
		);
	}

	evaluateWaiting(
		events: InstanceAiEvent[],
		confirmationEvent: InstanceAiConfirmationRequestEvent | undefined,
	): TerminalResponseDecision {
		const visibility = this.getVisibility(events);
		if (visibility.hasCurrentRunFallback) {
			return {
				status: 'waiting',
				visibilitySource: 'fallback',
				action: 'none',
				reason: 'already-emitted',
			};
		}

		const hasDisplayableConfirmation =
			confirmationEvent !== undefined &&
			isDisplayableConfirmationRequest(confirmationEvent.payload);
		if (!hasDisplayableConfirmation) {
			return this.emitError(
				'waiting',
				'confirmation-invalid',
				'I need your input to continue, but I could not display the prompt. Please try again.',
			);
		}

		if (visibility.hasRootText || visibility.hasRootError) {
			return {
				status: 'waiting',
				visibilitySource: visibility.hasRootError ? 'root-error' : 'root-text',
				action: 'none',
				reason: 'already-visible',
			};
		}

		return {
			status: 'waiting',
			visibilitySource: 'confirmation-ui',
			action: 'none',
			reason: 'confirmation-visible',
		};
	}

	private getVisibility(events: InstanceAiEvent[]): {
		hasRootText: boolean;
		hasRootError: boolean;
		hasCurrentRunFallback: boolean;
	} {
		const currentRunEvents = events.filter((event) => event.runId === this.options.runId);
		return {
			hasRootText: currentRunEvents.some(
				(event) => event.agentId === this.options.rootAgentId && hasText(event),
			),
			hasRootError: currentRunEvents.some(
				(event) => event.agentId === this.options.rootAgentId && event.type === 'error',
			),
			hasCurrentRunFallback: currentRunEvents.some((event) =>
				event.responseId?.startsWith(`${FALLBACK_RESPONSE_PREFIX}:${this.options.runId}:`),
			),
		};
	}

	private emitText(
		status: TerminalResponseStatus,
		reason: TerminalResponseDecision['reason'],
		text: string,
	): TerminalResponseDecision {
		return {
			status,
			visibilitySource: 'none',
			action: 'emit',
			reason,
			event: {
				type: 'text-delta',
				runId: this.options.runId,
				agentId: this.options.rootAgentId,
				responseId: this.fallbackResponseId(status),
				payload: { text },
			},
		};
	}

	private emitError(
		status: TerminalResponseStatus,
		reason: TerminalResponseDecision['reason'],
		content: string,
	): TerminalResponseDecision {
		return {
			status,
			visibilitySource: 'none',
			action: 'emit',
			reason,
			event: {
				type: 'error',
				runId: this.options.runId,
				agentId: this.options.rootAgentId,
				responseId: this.fallbackResponseId(status),
				payload: { content },
			},
		};
	}

	private fallbackResponseId(status: TerminalResponseStatus): string {
		return `${FALLBACK_RESPONSE_PREFIX}:${this.options.runId}:${status}`;
	}
}
