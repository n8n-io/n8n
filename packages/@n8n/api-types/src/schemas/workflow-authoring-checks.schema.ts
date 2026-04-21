import { z } from 'zod';

export const WORKFLOW_AUTHORING_CHECK_SEVERITIES = ['warning', 'blocking'] as const;
export type WorkflowAuthoringCheckSeverity = (typeof WORKFLOW_AUTHORING_CHECK_SEVERITIES)[number];

export const workflowCheckViolationSchema = z.object({
	message: z.string(),
	nodeIds: z.array(z.string()).optional(),
	data: z.record(z.unknown()).optional(),
});
export type WorkflowCheckViolation = z.infer<typeof workflowCheckViolationSchema>;

export const workflowCheckResultSchema = z.object({
	checkId: z.string(),
	title: z.string(),
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

export interface WorkflowCheckConfigDto {
	checkId: string;
	title: string;
	description: string;
	defaultSeverity: WorkflowAuthoringCheckSeverity;
	severityOverride: WorkflowAuthoringCheckSeverity | null;
	effectiveSeverity: WorkflowAuthoringCheckSeverity;
	enabled: boolean;
}

export interface WorkflowAuthoringChecksListResponse {
	checks: WorkflowCheckConfigDto[];
}
