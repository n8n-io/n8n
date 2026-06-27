import type {
	IWorkflowSettings as IWorkflowSettingsWorkflow,
	ValidationResult,
} from 'n8n-workflow';

export type Class<T = object, A extends unknown[] = unknown[]> = new (...args: A) => T;

export interface IResponseError extends Error {
	statusCode?: number;
}

export interface IWorkflowSettings extends IWorkflowSettingsWorkflow {
	readonly errorWorkflow?: string;
	readonly timezone?: string;
	readonly saveManualRuns?: boolean;
}

export type ExtendedValidationResult = ValidationResult & { fieldName?: string };
