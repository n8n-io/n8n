import type {
	IPollResponse,
	ITriggerResponse,
	IWorkflowSettings as IWorkflowSettingsWorkflow,
	ValidationResult,
} from 'n8n-workflow';

export interface IProcessMessage {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data?: any;
	type: string;
}

export interface IResponseError extends Error {
	statusCode?: number;
}

export interface IUserSettings {
	encryptionKey?: string;
	tunnelSubdomain?: string;
	instanceId?: string;
}

export interface IWorkflowSettings extends IWorkflowSettingsWorkflow {
	errorWorkflow?: string;
	timezone?: string;
	saveManualRuns?: boolean;
}

export interface IWorkflowData {
	pollResponses?: IPollResponse[];
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

export type ExtendedValidationResult = Partial<ValidationResult> & { fieldName?: string };
