import { z } from 'zod';

// Enums
export const breakingChangeRuleSeveritySchema = z.enum(['low', 'medium', 'critical']);
export type BreakingChangeRuleSeverity = z.infer<typeof breakingChangeRuleSeveritySchema>;

export const breakingChangeIssueLevelSchema = z.enum(['info', 'warning', 'error']);

const breakingChangeVersionSchema = z.enum(['v2']);
export type BreakingChangeVersion = z.infer<typeof breakingChangeVersionSchema>;

// Common schemas
const recommendationSchema = z.object({
	action: z.string(),
	description: z.string(),
});
export type BreakingChangeRecommendation = z.infer<typeof recommendationSchema>;

const instanceIssueSchema = z.object({
	title: z.string(),
	description: z.string(),
	level: breakingChangeIssueLevelSchema,
});
export type BreakingChangeInstanceIssue = z.infer<typeof instanceIssueSchema>;

const workflowIssueSchema = instanceIssueSchema.extend({
	nodeId: z.string().optional(),
	nodeName: z.string().optional(),
});
export type BreakingChangeWorkflowIssue = z.infer<typeof workflowIssueSchema>;

const affectedWorkflowSchema = z.object({
	id: z.string(),
	name: z.string(),
	active: z.boolean(),
	numberOfExecutions: z.number(),
	lastUpdatedAt: z.date(),
	lastExecutedAt: z.date().nullable(),
	issues: z.array(workflowIssueSchema),
});
export type BreakingChangeAffectedWorkflow = z.infer<typeof affectedWorkflowSchema>;

const ruleResultBaseSchema = z.object({
	ruleId: z.string(),
	ruleTitle: z.string(),
	ruleDescription: z.string(),
	ruleSeverity: breakingChangeRuleSeveritySchema,
	ruleDocumentationUrl: z.string().optional(),
	recommendations: z.array(recommendationSchema),
});

const instanceRuleResultsSchema = ruleResultBaseSchema.extend({
	instanceIssues: z.array(instanceIssueSchema),
});
export type BreakingChangeInstanceRuleResult = z.infer<typeof instanceRuleResultsSchema>;

const workflowRuleResultsSchema = ruleResultBaseSchema.extend({
	affectedWorkflows: z.array(affectedWorkflowSchema),
});
export type BreakingChangeWorkflowRuleResult = z.infer<typeof workflowRuleResultsSchema>;

const breakingChangeReportDataSchema = {
	generatedAt: z.date(),
	targetVersion: z.string(),
	currentVersion: z.string(),
	instanceResults: z.array(instanceRuleResultsSchema),
	workflowResults: z.array(workflowRuleResultsSchema),
} as const;

const breakingChangeReportSchema = z.object(breakingChangeReportDataSchema).strict();

const breakingChangeLightReportDataSchema = {
	generatedAt: z.date(),
	targetVersion: z.string(),
	currentVersion: z.string(),
	instanceResults: z.array(instanceRuleResultsSchema),
	workflowResults: z.array(
		workflowRuleResultsSchema.omit({ affectedWorkflows: true }).extend({
			nbAffectedWorkflows: z.number(),
		}),
	),
} as const;

const breakingChangeLightReportSchema = z.object(breakingChangeLightReportDataSchema).strict();

const breakingChangeReportResultDataSchema = z.object({
	report: breakingChangeReportSchema,
	totalWorkflows: z.number(),
	shouldCache: z.boolean(),
});
export type BreakingChangeReportResult = z.infer<typeof breakingChangeReportResultDataSchema>;

const breakingChangeLightReportResultDataSchema = z.object({
	report: breakingChangeLightReportSchema,
	totalWorkflows: z.number(),
	shouldCache: z.boolean(),
});
export type BreakingChangeLightReportResult = z.infer<
	typeof breakingChangeLightReportResultDataSchema
>;
