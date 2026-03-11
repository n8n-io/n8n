import type { ErrorData } from './errors/error-classifier';

export interface StepStartedEvent {
	type: 'step:started';
	executionId: string;
	stepId: string;
	attempt: number;
}

export interface StepCompletedEvent {
	type: 'step:completed';
	executionId: string;
	stepId: string;
	output: unknown;
	durationMs: number;
	parentStepExecutionId?: string;
}

export interface StepFailedEvent {
	type: 'step:failed';
	executionId: string;
	stepId: string;
	error: ErrorData;
	parentStepExecutionId?: string;
}

export interface StepRetryingEvent {
	type: 'step:retrying';
	executionId: string;
	stepId: string;
	attempt: number;
	retryAfter: string;
	error: ErrorData;
}

export interface StepWaitingEvent {
	type: 'step:waiting';
	executionId: string;
	stepId: string;
}

export interface StepWaitingApprovalEvent {
	type: 'step:waiting_approval';
	executionId: string;
	stepId: string;
}

export interface StepCancelledEvent {
	type: 'step:cancelled';
	executionId: string;
	stepId: string;
}

export interface StepChunkEvent {
	type: 'step:chunk';
	executionId: string;
	stepId: string;
	data: unknown;
	timestamp: number;
}

export interface ExecutionStartedEvent {
	type: 'execution:started';
	executionId: string;
}

export interface ExecutionCompletedEvent {
	type: 'execution:completed';
	executionId: string;
	result: unknown;
}

export interface ExecutionFailedEvent {
	type: 'execution:failed';
	executionId: string;
	error: ErrorData;
}

export interface ExecutionCancelledEvent {
	type: 'execution:cancelled';
	executionId: string;
}

export interface ExecutionPausedEvent {
	type: 'execution:paused';
	executionId: string;
	lastCompletedStepId: string;
}

export interface ExecutionResumedEvent {
	type: 'execution:resumed';
	executionId: string;
}

export interface ExecutionCancelRequestedEvent {
	type: 'execution:cancel_requested';
	executionId: string;
}

export interface ExecutionPauseRequestedEvent {
	type: 'execution:pause_requested';
	executionId: string;
	resumeAfter?: string;
}

export interface WebhookRespondEvent {
	type: 'webhook:respond';
	executionId: string;
	statusCode: number;
	body: unknown;
	headers?: Record<string, string>;
}

export type StepEvent =
	| StepStartedEvent
	| StepCompletedEvent
	| StepFailedEvent
	| StepRetryingEvent
	| StepWaitingEvent
	| StepWaitingApprovalEvent
	| StepCancelledEvent
	| StepChunkEvent;

export type ExecutionEvent =
	| ExecutionStartedEvent
	| ExecutionCompletedEvent
	| ExecutionFailedEvent
	| ExecutionCancelledEvent
	| ExecutionPausedEvent
	| ExecutionResumedEvent
	| ExecutionCancelRequestedEvent
	| ExecutionPauseRequestedEvent;

export type EngineEvent = StepEvent | ExecutionEvent | WebhookRespondEvent;
