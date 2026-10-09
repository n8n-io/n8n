import type {
	BreakingChangeRecommendation,
	BreakingChangeRuleImpact,
	BreakingChangeVersion,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { UrlService, WorkflowSharingService } from '@n8n/backend-services';
import type { WorkflowRepository } from '@n8n/db';
import z from 'zod';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { BreakingChangeMigrationService } from '@/modules/breaking-changes/breaking-changes.migration.service';
import type { MigrationRegistry } from '@/modules/breaking-changes/breaking-changes.migration-registry.service';
import type { RuleRegistry } from '@/modules/breaking-changes/breaking-changes.rule-registry.service';
import type { MigrationFindingQueryService } from '@/modules/breaking-changes/query/migration-finding-query.service';
import type { MigrationFindingSyncService } from '@/modules/breaking-changes/sync/migration-finding-sync.service';
import type { MigrationFindingTriageService } from '@/modules/breaking-changes/triage/migration-finding-triage.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

/** The services the migration report tools read and write through. */
export type MigrationReportToolDeps = {
	targetVersion: BreakingChangeVersion;
	ruleRegistry: RuleRegistry;
	migrationRegistry: MigrationRegistry;
	syncService: MigrationFindingSyncService;
	queryService: MigrationFindingQueryService;
	triageService: MigrationFindingTriageService;
	migrationService: BreakingChangeMigrationService;
	workflowSharingService: WorkflowSharingService;
	workflowRepository: WorkflowRepository;
	workflowFinderService: WorkflowFinderService;
	collaborationService: CollaborationService;
	urlService: UrlService;
	telemetry: Telemetry;
	logger: Logger;
};

/** Most severe first, the same order the migration report page uses. */
const IMPACT_ORDER: Record<BreakingChangeRuleImpact, number> = {
	upgradeBlocked: 0,
	executionsFail: 1,
	behaviorChanges: 2,
	capabilityRemoved: 3,
};

export const byImpact = (a: { impact: BreakingChangeRuleImpact }, b: typeof a) =>
	IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact];

export const impactSchema = z
	.enum(['upgradeBlocked', 'executionsFail', 'behaviorChanges', 'capabilityRemoved'])
	.describe(
		'What happens if the issue is not fixed before the update: upgradeBlocked (the instance does not start or the update cannot proceed), executionsFail (affected executions error), behaviorChanges (executions run with a different result), capabilityRemoved (a removed capability, no runtime impact)',
	);

export type RuleResolution = 'workflowEdit' | 'userConfirmation' | 'instanceConfiguration';

export const resolutionSchema = z
	.enum(['workflowEdit', 'userConfirmation', 'instanceConfiguration'])
	.describe(
		'How a finding is resolved: workflowEdit (fix the workflow; the finding clears on save), userConfirmation (no workflow edit clears it; once the user confirms the change is handled, set the finding to wont_fix), instanceConfiguration (change the deployment or environment; no workflow edit applies)',
	);

/** The resolution a workflow rule declares, `workflowEdit` unless it says otherwise. */
export const workflowRuleResolution = (ruleRegistry: RuleRegistry, ruleId: string) =>
	ruleRegistry.getRule(ruleId)?.getMetadata().resolution ?? 'workflowEdit';

export const issueSchema = z.object({
	nodeId: z.string().optional(),
	nodeName: z.string().optional(),
	title: z.string(),
	description: z.string(),
	level: z.enum(['info', 'warning', 'error']),
});

/** The rule fields every migration report tool returns. */
export const ruleOutputShape = {
	ruleId: z.string(),
	title: z.string(),
	description: z.string(),
	impact: impactSchema,
	resolution: resolutionSchema,
	documentationUrl: z.string().optional(),
	recommendations: z
		.array(z.object({ action: z.string(), description: z.string() }))
		.describe('How to fix the issue'),
	migratable: z
		.boolean()
		.describe('True when migrate_workflow can apply a built-in fix for this rule'),
} satisfies z.ZodRawShape;

type RuleSource = {
	ruleId: string;
	ruleTitle: string;
	ruleDescription: string;
	ruleImpact: BreakingChangeRuleImpact;
	ruleDocumentationUrl?: string;
	recommendations: BreakingChangeRecommendation[];
	migratable: boolean;
};

export const toRuleOutput = (rule: RuleSource, resolution: RuleResolution) => ({
	ruleId: rule.ruleId,
	title: rule.ruleTitle,
	description: rule.ruleDescription,
	impact: rule.ruleImpact,
	resolution,
	...(rule.ruleDocumentationUrl ? { documentationUrl: rule.ruleDocumentationUrl } : {}),
	recommendations: rule.recommendations,
	migratable: rule.migratable,
});

/** What a save tool reports about the migration findings of the workflow it saved. */
export const workflowMigrationFindingsSchema = z
	.object({
		targetVersion: z.string(),
		openFindings: z
			.array(
				z.object({
					ruleId: z.string(),
					title: z.string(),
					impact: impactSchema,
					resolution: resolutionSchema,
					issues: z.array(issueSchema),
				}),
			)
			.describe('Findings still open on this workflow. Empty when nothing is left to fix.'),
		wontFixFindings: z
			.number()
			.int()
			.min(0)
			.describe('Findings a user accepted, which count as resolved'),
	})
	.describe(
		'The migration report findings of this workflow after the save, so a fix needs no extra check. Present only for a workflow the migration report flags or flagged.',
	);

export type WorkflowMigrationFindings = z.infer<typeof workflowMigrationFindingsSchema>;

/** Reads the migration findings of a workflow right after a save. */
export type ReadWorkflowMigrationFindings = (
	workflowId: string,
) => Promise<WorkflowMigrationFindings | undefined>;

/**
 * Re-checks one workflow, then returns the findings still open on it. Returns
 * `undefined` for a workflow the report never flagged, so a save of an
 * unrelated workflow reports nothing.
 */
export async function readWorkflowMigrationFindings(
	deps: Pick<
		MigrationReportToolDeps,
		'targetVersion' | 'syncService' | 'queryService' | 'ruleRegistry'
	>,
	workflowId: string,
): Promise<WorkflowMigrationFindings | undefined> {
	// The save listener runs the same re-check. The sync service runs the two one
	// after the other, so the read below sees the result of the latest save.
	await deps.syncService.syncWorkflow(workflowId);
	const findings = await deps.queryService.getWorkflowFindings(deps.targetVersion, workflowId);
	if (
		findings.length === 0 &&
		!(await deps.queryService.hasWorkflowFindings(deps.targetVersion, workflowId))
	) {
		return undefined;
	}

	const open = findings.filter((finding) => finding.status === 'open');
	return {
		targetVersion: deps.targetVersion,
		openFindings: open
			.map((finding) => ({
				ruleId: finding.ruleId,
				title: finding.ruleTitle,
				impact: finding.ruleImpact,
				resolution: workflowRuleResolution(deps.ruleRegistry, finding.ruleId),
				issues: finding.issues,
			}))
			.sort(byImpact),
		wontFixFindings: findings.length - open.length,
	};
}

export const getWorkflowUrl = (urlService: UrlService, workflowId: string) =>
	`${urlService.getInstanceBaseUrl()}/workflow/${encodeURIComponent(workflowId)}`;

export const getReportUrl = (urlService: UrlService, ruleId?: string) =>
	`${urlService.getInstanceBaseUrl()}/settings/migration-report${ruleId ? `/${encodeURIComponent(ruleId)}` : ''}`;
