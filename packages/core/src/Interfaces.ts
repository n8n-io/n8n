import type {
	ITriggerResponse,
	IWorkflowSettings as IWorkflowSettingsWorkflow,
	ValidationResult,
} from 'n8n-workflow';

import type { ExecutionHooks } from '@/execution-hooks';

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

export namespace n8n {
	export interface PackageJson {
		name: string;
		version: string;
		n8n?: {
			credentials?: string[];
			nodes?: string[];
		};
		author?: {
			name?: string;
			email?: string;
		};
	}
}

declare module 'n8n-workflow' {
	interface IWorkflowExecuteAdditionalData {
		hooks?: ExecutionHooks;
	}
}

export type ExtendedValidationResult = ValidationResult & { fieldName?: string };
