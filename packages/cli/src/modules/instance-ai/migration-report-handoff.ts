import {
	MIGRATION_REPORT_TARGET_VERSION,
	type BreakingChangeAssistantAction,
	type BreakingChangeRuleImpact,
	type BreakingChangeWorkflowIssue,
	type InstanceAiAutomatedMigrationOutcome,
	type InstanceAiMigrationReportHandoffContext,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import {
	MIGRATION_REPORT_CONTEXT_CLOSE_TAG,
	MIGRATION_REPORT_CONTEXT_OPEN_TAG,
	sanitisePromptText,
	toTagSafeJson,
} from './internal-messages';
import type { RuleDescription } from '@/modules/breaking-changes/query/migration-finding-query.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

/** One migration report finding as the hand-off block describes it. */
export interface MigrationReportFinding {
	workflow: { id: string; name: string };
	rule: RuleDescription;
	/** The workflow's current issues for the rule. Empty when a fix already landed. */
	issues: BreakingChangeWorkflowIssue[];
}

/** Longest issue or migration text kept in the block. Issue text embeds node names. */
const FINDING_TEXT_MAX_LENGTH = 1000;

/** How the Assistant approaches the finding, from the action the rule declares. */
const ASSISTANT_ACTION_GUIDANCE: Record<BreakingChangeAssistantAction, string> = {
	fix: 'Fix the workflow so the report no longer finds this issue.',
	review:
		'This finding is a review: the right change depends on what the user wants. Explain the change for this workflow and let the user decide. Do not change the workflow only to clear the finding.',
	none: 'This finding cannot be fixed in the workflow. Explain what the user has to change outside it, and do not edit the workflow.',
};

const IMPACT_SUMMARY: Record<BreakingChangeRuleImpact, string> = {
	executionsFail: 'executions of the affected nodes will fail after the update',
	executionsMightFail: 'executions might fail after the update',
	behaviorChanges: 'the workflow keeps running after the update, but its output changes',
	capabilityRemoved: 'a capability the workflow uses is removed',
	upgradeBlocked: 'the instance cannot be updated until this is fixed',
};

/**
 * Reads the finding the user opened from the migration report: the rule as the report
 * describes it and the workflow's current issues. Throws when the report is off, the
 * user cannot read the workflow, or no workflow rule has the id.
 */
export async function resolveMigrationReportFinding(
	context: InstanceAiMigrationReportHandoffContext,
	user: User,
): Promise<MigrationReportFinding> {
	if (
		!MIGRATION_REPORT_TARGET_VERSION ||
		!Container.get(ModuleRegistry).isActive('breaking-changes')
	) {
		throw new UserError('The migration report is not available on this instance');
	}

	const workflow = await Container.get(WorkflowFinderService).findWorkflowForUser(
		context.workflowId,
		user,
		['workflow:read'],
	);
	if (!workflow) {
		throw new UserError('Workflow not found, or you do not have access to it');
	}

	const { MigrationFindingQueryService } = await import(
		'@/modules/breaking-changes/query/migration-finding-query.service.js'
	);
	const finding = await Container.get(MigrationFindingQueryService).describeWorkflowFinding(
		context.ruleId,
		workflow,
	);
	if (!finding) {
		throw new UserError('This migration report finding no longer exists');
	}

	return { workflow: { id: workflow.id, name: workflow.name }, ...finding };
}

function formatIssue(issue: BreakingChangeWorkflowIssue): string {
	const node = issue.nodeName
		? `"${sanitisePromptText(issue.nodeName)}"${issue.nodeId ? ` (id \`${sanitisePromptText(issue.nodeId)}\`)` : ''}: `
		: '';
	const text = sanitisePromptText(`${issue.title}. ${issue.description}`, FINDING_TEXT_MAX_LENGTH);
	return `- ${node}${text}`;
}

function formatAutomatedMigration(outcome: InstanceAiAutomatedMigrationOutcome): string[] {
	const clean = (value: string) => sanitisePromptText(value, FINDING_TEXT_MAX_LENGTH);
	if (outcome.outcome === 'refused') {
		const node = outcome.nodeName ? ` on node "${sanitisePromptText(outcome.nodeName)}"` : '';
		return [
			`The user first ran the automated migration. It refused${node} and changed nothing: ${clean(outcome.message)}`,
		];
	}
	return [
		'The user first ran the automated migration. It replaced the nodes and saved the workflow, but left work behind. Read the workflow again before you change it.',
		...outcome.notes.map((note) => `- Note: ${clean(note)}`),
		...outcome.unmapped.map((parameter) => `- Not carried over: ${clean(parameter)}`),
	];
}

/**
 * The opening-turn block of a migration report hand-off: the finding, what the report
 * recommends, and the `v3-migration` skill, so the fix starts without a `load_skill` call.
 */
export function buildMigrationReportContextBlock(
	context: InstanceAiMigrationReportHandoffContext,
	finding: MigrationReportFinding,
	skillInstructions: string,
): string {
	const { workflow, rule, issues } = finding;
	const ref = toTagSafeJson({
		source: context.source,
		ruleId: rule.ruleId,
		workflowId: workflow.id,
	});

	const lines = [
		`The user opened this conversation from the n8n ${MIGRATION_REPORT_TARGET_VERSION ?? ''} migration report to fix one finding in the workflow "${sanitisePromptText(workflow.name)}" (id \`${sanitisePromptText(workflow.id)}\`).`,
		`Finding: ${rule.ruleTitle} (\`${rule.ruleId}\`). Impact: ${IMPACT_SUMMARY[rule.ruleImpact]}.`,
		`What changes: ${rule.ruleDescription}`,
		ASSISTANT_ACTION_GUIDANCE[rule.assistantAction],
		...(issues.length > 0
			? ['Affected nodes in the current workflow:', ...issues.map(formatIssue)]
			: [
					'The report no longer finds this issue in the current workflow. Check what the user still needs before you change anything.',
				]),
		...(rule.recommendations.length > 0
			? [
					'The report recommends:',
					...rule.recommendations.map(
						(recommendation) => `- ${recommendation.action}: ${recommendation.description}`,
					),
				]
			: []),
		...(rule.ruleDocumentationUrl ? [`Documentation: ${rule.ruleDocumentationUrl}`] : []),
		...(context.automatedMigration ? formatAutomatedMigration(context.automatedMigration) : []),
		'The v3-migration skill below is loaded for this thread: follow it and do not call load_skill for it.',
	];

	return [
		MIGRATION_REPORT_CONTEXT_OPEN_TAG,
		ref,
		'',
		...lines,
		'',
		'<v3-migration-skill>',
		skillInstructions.trim(),
		'</v3-migration-skill>',
		MIGRATION_REPORT_CONTEXT_CLOSE_TAG,
	].join('\n');
}
