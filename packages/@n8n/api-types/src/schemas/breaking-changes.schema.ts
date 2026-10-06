import { z } from 'zod';

// Enums

/**
 * What happens if the user does not fix a breaking change before the update.
 *
 * - `upgradeBlocked`: the instance does not start, or the update cannot proceed.
 * - `executionsFail`: affected executions error.
 * - `behaviorChanges`: executions keep running, but with a different result.
 * - `capabilityRemoved`: no runtime impact, a removed capability is no longer available.
 */
export const breakingChangeRuleImpactSchema = z.enum([
	'executionsFail',
	'behaviorChanges',
	'capabilityRemoved',
	'upgradeBlocked',
]);
export type BreakingChangeRuleImpact = z.infer<typeof breakingChangeRuleImpactSchema>;

export const breakingChangeIssueLevelSchema = z.enum(['info', 'warning', 'error']);

export const breakingChangeVersionSchema = z.enum(['v2', 'v3']);
export type BreakingChangeVersion = z.infer<typeof breakingChangeVersionSchema>;

/**
 * Triage state of one migration finding (one workflow x one rule x one target version).
 *
 * - `open`: the scan found the issue and nobody acted on it yet.
 * - `notified`: the owner received a notification about the finding.
 * - `fixed`: the scan no longer detects the issue in the published version.
 * - `fixed_unpublished`: the scan no longer detects the issue in the draft, but the fix is not published.
 * - `wont_fix`: a user dismissed the finding.
 */
export const migrationFindingStatusSchema = z.enum([
	'open',
	'notified',
	'fixed',
	'fixed_unpublished',
	'wont_fix',
]);
export type MigrationFindingStatus = z.infer<typeof migrationFindingStatusSchema>;

/** The statuses a user can set on a finding. The scan sets the other statuses. */
export const migrationFindingTriageStatusSchema = migrationFindingStatusSchema.extract([
	'open',
	'wont_fix',
]);
export type MigrationFindingTriageStatus = z.infer<typeof migrationFindingTriageStatusSchema>;

/**
 * The target n8n major version for the migration/breaking-changes report.
 *
 * Set this to a version (e.g. 'v2') to enable the migration report on both
 * frontend (settings sidebar + page) and backend (controller + service).
 * Set to `null` to disable it entirely on both sides.
 *
 * When a new major version is released, update this value and add the
 * corresponding breaking-change rules on the backend.
 */
export const MIGRATION_REPORT_TARGET_VERSION: BreakingChangeVersion | null = 'v3';

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

/** `suggested` by the owner heuristic, or `assigned` by a person. */
export const migrationOwnerSourceSchema = z.enum(['suggested', 'assigned']);
export type MigrationOwnerSource = z.infer<typeof migrationOwnerSourceSchema>;

/** The user responsible for fixing a workflow's findings. */
const workflowOwnerSchema = z.object({
	id: z.string(),
	firstName: z.string(),
	lastName: z.string(),
	email: z.string(),
	source: migrationOwnerSourceSchema,
});
export type BreakingChangeWorkflowOwner = z.infer<typeof workflowOwnerSchema>;

const affectedWorkflowSchema = z.object({
	id: z.string(),
	name: z.string(),
	active: z.boolean(),
	numberOfExecutions: z.number(),
	lastUpdatedAt: z.date(),
	lastExecutedAt: z.date().optional(),
	issues: z.array(workflowIssueSchema),
	// Absent when no owner is known for the workflow.
	owner: workflowOwnerSchema.optional(),
});
export type BreakingChangeAffectedWorkflow = z.infer<typeof affectedWorkflowSchema>;

const ruleResultBaseSchema = z.object({
	ruleId: z.string(),
	ruleTitle: z.string(),
	ruleDescription: z.string(),
	ruleImpact: breakingChangeRuleImpactSchema,
	ruleDocumentationUrl: z.string().optional(),
	recommendations: z.array(recommendationSchema),
	// True when an automated migration is registered for this rule, so the UI
	// can offer a "Migrate" action instead of prose-only advice.
	migratable: z.boolean(),
});

const instanceRuleResultsSchema = ruleResultBaseSchema.extend({
	instanceIssues: z.array(instanceIssueSchema),
});
export type BreakingChangeInstanceRuleResult = z.infer<typeof instanceRuleResultsSchema>;

const workflowRuleResultsSchema = ruleResultBaseSchema.extend({
	affectedWorkflows: z.array(affectedWorkflowSchema),
});
export type BreakingChangeWorkflowRuleResult = z.infer<typeof workflowRuleResultsSchema>;

// The rule detail lists each workflow with the status of its finding.
const ruleDetailWorkflowSchema = affectedWorkflowSchema.extend({
	status: migrationFindingTriageStatusSchema,
});
export type BreakingChangeRuleDetailWorkflow = z.infer<typeof ruleDetailWorkflowSchema>;

const ruleDetailResultSchema = workflowRuleResultsSchema.extend({
	affectedWorkflows: z.array(ruleDetailWorkflowSchema),
});
export type BreakingChangeRuleDetailResult = z.infer<typeof ruleDetailResultSchema>;

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
	// Distinct workflows affected by at least one rule. Summing per-rule
	// nbAffectedWorkflows counts a workflow once for each rule it breaks.
	totalAffectedWorkflows: z.number(),
	shouldCache: z.boolean(),
});
export type BreakingChangeLightReportResult = z.infer<
	typeof breakingChangeLightReportResultDataSchema
>;

// Result of applying an automated node migration to a single workflow.
const workflowMigrationResultSchema = z.object({
	workflowId: z.string(),
	// versionId of the new workflow version created by the migration.
	newVersionId: z.string(),
	// Ids of the nodes that were rewritten.
	migratedNodeIds: z.array(z.string()),
	// Parameters that could not be carried over (empty for lossless migrations).
	unmapped: z.array(z.string()),
	// Behavior/output changes the user should be aware of.
	notes: z.array(z.string()),
	// True when the migration can be published in one click: it was lossless (no
	// unmapped/notes), the migrated version was the one currently published, and
	// the result still validates for activation (real trigger, no node errors).
	republishable: z.boolean(),
});
export type WorkflowMigrationResult = z.infer<typeof workflowMigrationResultSchema>;
