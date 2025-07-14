import type {
	ITriggerResponse,
	IWorkflowSettings as IWorkflowSettingsWorkflow,
	ValidationResult,
} from 'n8n-workflow';

export type Class<T = object, A extends unknown[] = unknown[]> = new (...args: A) => T;

export interface IResponseError extends Error {
	statusCode?: number;
}

export interface IWorkflowSettings extends IWorkflowSettingsWorkflow {
	errorWorkflow?: string;
	timezone?: string;
	saveManualRuns?: boolean;
}

export interface IWorkflowData {
	triggerResponses?: ITriggerResponse[];
}

export type ExtendedValidationResult = ValidationResult & { fieldName?: string };
