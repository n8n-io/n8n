import type { IWorkflowSettings } from 'n8n-workflow';

export type NewWorkflowDefaultSettings = Pick<IWorkflowSettings, 'executionOrder' | 'timezone'>;

export type GetNewWorkflowResponse = {
	name: string;
	defaultSettings: NewWorkflowDefaultSettings;
};
