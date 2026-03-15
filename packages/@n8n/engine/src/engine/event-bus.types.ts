import type { ErrorData } from './errors/error-classifier';

export interface BaseEvent {
	eventId: string;
	createdAt: number;
}

export interface StepStartedEvent extends BaseEvent {
	type: 'step:started';
	executionId: string;
	stepId: string;
	attempt: number;
}

export interface StepCompletedEvent extends BaseEvent {
	type: 'step:completed';
	executionId: string;
	stepId: string;
	output: unknown;
	durationMs: number;
	parentStepExecutionId?: string;
}

export interface StepFailedEvent extends BaseEvent {
	type: 'step:failed';
	executionId: string;
	stepId: string;
	error: ErrorData;
	parentStepExecutionId?: string;
}

export interface StepRetryingEvent extends BaseEvent {
	type: 'step:retrying';
	executionId: string;
	stepId: string;
	attempt: number;
	retryAfter: string;
	error: ErrorData;
}

export interface StepWaitingEvent extends BaseEvent {
	type: 'step:waiting';
	executionId: string;
	stepId: string;
}

export interface StepWaitingApprovalEvent extends BaseEvent {
	type: 'step:waiting_approval';
	executionId: string;
	stepId: string;
	stepExecutionId: string;
	approvalToken: string;
	/** The approval context returned by the step function — shown to the approver in the UI */
	context: unknown;
}

export interface StepCancelledEvent extends BaseEvent {
	type: 'step:cancelled';
	executionId: string;
	stepId: string;
}

export interface StepChunkEvent extends BaseEvent {
	type: 'step:chunk';
	executionId: string;
	stepId: string;
	data: unknown;
	timestamp: number;
}

export interface StepAgentSuspendedEvent extends BaseEvent {
	type: 'step:agent_suspended';
	executionId: string;
	stepId: string;
	suspendPayload: unknown;
	toolName: string;
}

export interface StepAgentResumedEvent extends BaseEvent {
	type: 'step:agent_resumed';
	executionId: string;
	stepId: string;
}

export interface ExecutionStartedEvent extends BaseEvent {
	type: 'execution:started';
	executionId: string;
}

export interface ExecutionCompletedEvent extends BaseEvent {
	type: 'execution:completed';
	executionId: string;
	result: unknown;
}

export interface ExecutionFailedEvent extends BaseEvent {
	type: 'execution:failed';
	executionId: string;
	error: ErrorData;
}

export interface ExecutionCancelledEvent extends BaseEvent {
	type: 'execution:cancelled';
	executionId: string;
}

export interface ExecutionPausedEvent extends BaseEvent {
	type: 'execution:paused';
	executionId: string;
	lastCompletedStepId: string;
}

export interface ExecutionResumedEvent extends BaseEvent {
	type: 'execution:resumed';
	executionId: string;
}

export interface ExecutionCancelRequestedEvent extends BaseEvent {
	type: 'execution:cancel_requested';
	executionId: string;
}

export interface ExecutionPauseRequestedEvent extends BaseEvent {
	type: 'execution:pause_requested';
	executionId: string;
	resumeAfter?: string;
}

export interface WebhookRespondEvent extends BaseEvent {
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
	| StepChunkEvent
	| StepAgentSuspendedEvent
	| StepAgentResumedEvent;

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

/** Distributive Omit that preserves discriminated unions */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/** Input type for emit() — eventId and createdAt are auto-assigned if omitted */
export type EmittableEvent = DistributiveOmit<EngineEvent, 'eventId' | 'createdAt'> &
	Partial<Pick<BaseEvent, 'eventId' | 'createdAt'>>;
