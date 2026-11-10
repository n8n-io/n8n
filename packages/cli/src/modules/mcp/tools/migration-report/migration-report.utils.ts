import {
	breakingChangeAssistantActionSchema,
	breakingChangeRuleImpactSchema,
	breakingChangeWorkflowIssueSchema,
	type BreakingChangeRecommendation,
	type BreakingChangeRuleImpact,
	type BreakingChangeVersion,
	type MigrationFindingListedStatus,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { UrlService } from '@n8n/backend-services';
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
	executionsMightFail: 2,
	behaviorChanges: 3,
	capabilityRemoved: 4,
};

export const byImpact = (a: { impact: BreakingChangeRuleImpact }, b: typeof a) =>
	IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact];

export const impactSchema = breakingChangeRuleImpactSchema.describe(
	'What happens if the issue is not fixed before the update: upgradeBlocked (the instance does not start or the update cannot proceed), executionsFail (affected executions error), executionsMightFail (a default changes, so affected executions can error depending on the workload; an admin can keep the current value through configuration), behaviorChanges (executions run with a different result), capabilityRemoved (a removed capability, no runtime impact)',
);

export const assistantActionSchema = breakingChangeAssistantActionSchema.describe(
	'What to do with a finding of this rule when the rule is not migratable: fix (change the workflow so the finding no longer applies), review (the right change depends on what the user wants: explain what changes for the workflow, and change the workflow only after the user agrees), none (n8n offers no assisted fix for this rule: tell the user what the recommendations say, and change the workflow only when the user asks for it)',
);

export const workflowRuleAssistantAction = (ruleRegistry: RuleRegistry, ruleId: string) =>
	ruleRegistry.getRule(ruleId)?.getMetadata().assistant ?? 'none';

/** The rule fields every migration report tool returns. */
export const ruleOutputShape = {
	ruleId: z.string(),
	title: z.string(),
	description: z.string(),
	impact: impactSchema,
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

export const toRuleOutput = (rule: RuleSource) => ({
	ruleId: rule.ruleId,
	title: rule.ruleTitle,
	description: rule.ruleDescription,
	impact: rule.ruleImpact,
	...(rule.ruleDocumentationUrl ? { documentationUrl: rule.ruleDocumentationUrl } : {}),
	recommendations: rule.recommendations,
	migratable: rule.migratable,
});

export const workflowRuleOutputShape = {
	...ruleOutputShape,
	assistantAction: assistantActionSchema,
} satisfies z.ZodRawShape;

export const toWorkflowRuleOutput = (ruleRegistry: RuleRegistry, rule: RuleSource) => ({
	...toRuleOutput(rule),
	assistantAction: workflowRuleAssistantAction(ruleRegistry, rule.ruleId),
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
					assistantAction: assistantActionSchema,
					issues: z.array(breakingChangeWorkflowIssueSchema),
				}),
			)
			.describe('Findings still open on this workflow. Empty when nothing is left to fix.'),
		unpublishedFixes: z
			.number()
			.int()
			.min(0)
			.describe(
				'Findings fixed in the draft only. They are resolved when the workflow is published. Publish it only after the user agrees',
			),
		wontFixFindings: z
			.number()
			.int()
			.min(0)
			.describe('Findings a user accepted, which count as resolved'),
	})
	.describe(
		'The migration report findings of this workflow after the save, so a fix needs no extra check. Present only for a workflow the migration report flags or flagged. If it is missing after a fix, the re-check failed: call get_migration_findings with the workflowId.',
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
		'targetVersion' | 'syncService' | 'queryService' | 'ruleRegistry' | 'logger'
	>,
	workflowId: string,
): Promise<WorkflowMigrationFindings | undefined> {
	try {
		// Joins the re-check that the save listener queued instead of running the rules again.
		// A failed re-check leaves the table stale, so it must not be reported as current.
		if (!(await deps.syncService.awaitWorkflowSync(workflowId))) {
			deps.logger.warn('Could not re-check the saved workflow against the migration report', {
				workflowId,
			});
			return undefined;
		}
		const findings = await deps.queryService.getWorkflowFindings(deps.targetVersion, workflowId);
		if (!findings) return undefined;

		// A notification does not resolve a finding, so a notified one is still open.
		const open = findings.filter(
			(finding) => finding.status === 'open' || finding.status === 'notified',
		);
		const countWithStatus = (status: MigrationFindingListedStatus) =>
			findings.filter((finding) => finding.status === status).length;
		return {
			targetVersion: deps.targetVersion,
			openFindings: open
				.map((finding) => ({
					ruleId: finding.ruleId,
					title: finding.ruleTitle,
					impact: finding.ruleImpact,
					assistantAction: workflowRuleAssistantAction(deps.ruleRegistry, finding.ruleId),
					issues: finding.issues,
				}))
				.sort(byImpact),
			unpublishedFixes: countWithStatus('fixed_unpublished'),
			wontFixFindings: countWithStatus('wont_fix'),
		};
	} catch (error) {
		deps.logger.warn('Reading the migration findings of the saved workflow failed', {
			workflowId,
			error,
		});
		return undefined;
	}
}

/** Set on report reads whose sync was partial: the table can miss findings until the next sync. */
export const incompleteReportShape = {
	incomplete: z
		.boolean()
		.optional()
		.describe(
			'True when some workflows could not be checked, so the report can miss findings. Calling the tool again checks them again.',
		),
} satisfies z.ZodRawShape;

export const INCOMPLETE_REPORT_NOTE =
	'Some workflows could not be checked, so this report can miss findings. Call the tool again to check them again before you tell the user the instance is ready.';

export const getWorkflowUrl = (urlService: UrlService, workflowId: string) =>
	`${urlService.getInstanceBaseUrl()}/workflow/${encodeURIComponent(workflowId)}`;

export const getReportUrl = (urlService: UrlService, ruleId?: string) =>
	`${urlService.getInstanceBaseUrl()}/settings/migration-report${ruleId ? `/${encodeURIComponent(ruleId)}` : ''}`;
