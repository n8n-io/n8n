import { z } from 'zod';

export const WORKFLOW_AUTHORING_CHECK_SEVERITIES = ['warning', 'blocking'] as const;
export type WorkflowAuthoringCheckSeverity = (typeof WORKFLOW_AUTHORING_CHECK_SEVERITIES)[number];

export const WORKFLOW_CHECK_CONFIG_FIELD_KINDS = ['nodeType', 'string'] as const;
export type WorkflowCheckConfigFieldKind = (typeof WORKFLOW_CHECK_CONFIG_FIELD_KINDS)[number];

export const workflowCheckConfigFieldSchema = z.object({
	name: z.string(),
	label: z.string(),
	kind: z.enum(WORKFLOW_CHECK_CONFIG_FIELD_KINDS),
	required: z.boolean(),
	helpText: z.string().optional(),
	placeholder: z.string().optional(),
});
export type WorkflowCheckConfigField = z.infer<typeof workflowCheckConfigFieldSchema>;

export const workflowCheckConfigSchemaSchema = z.object({
	fields: z.array(workflowCheckConfigFieldSchema),
});
export type WorkflowCheckConfigSchema = z.infer<typeof workflowCheckConfigSchemaSchema>;

export const workflowCheckViolationSchema = z.object({
	message: z.string(),
	nodeIds: z.array(z.string()).optional(),
	data: z.record(z.unknown()).optional(),
});
export type WorkflowCheckViolation = z.infer<typeof workflowCheckViolationSchema>;

export const workflowCheckResultSchema = z.object({
	checkInstanceId: z.string(),
	type: z.string(),
	name: z.string(),
	severity: z.enum(WORKFLOW_AUTHORING_CHECK_SEVERITIES),
	violations: z.array(workflowCheckViolationSchema),
});
export type WorkflowCheckResult = z.infer<typeof workflowCheckResultSchema>;

export interface WorkflowAuthoringChecksSummary {
	blocking: number;
	warning: number;
}

export interface WorkflowAuthoringChecksPreviewResponse {
	results: WorkflowCheckResult[];
	summary: WorkflowAuthoringChecksSummary;
}

export interface WorkflowCheckTypeDto {
	type: string;
	title: string;
	description: string;
	defaultSeverity: WorkflowAuthoringCheckSeverity;
	configSchema: WorkflowCheckConfigSchema;
}

export interface WorkflowCheckDto {
	id: string;
	name: string;
	type: string;
	typeTitle: string;
	config: Record<string, unknown>;
	enabled: boolean;
	severity: WorkflowAuthoringCheckSeverity;
}

export interface WorkflowAuthoringChecksListResponse {
	checks: WorkflowCheckDto[];
}

export interface WorkflowAuthoringCheckTypesListResponse {
	types: WorkflowCheckTypeDto[];
}
