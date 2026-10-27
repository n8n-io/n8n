import {
	MIGRATION_REPORT_TARGET_VERSION,
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

/**
 * Reads the finding the user opened from the migration report: the rule as the report
 * describes it and the workflow's current issues. Throws when the report is off, the
 * user cannot read the workflow, or the rule does not offer the Assistant.
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
		MIGRATION_REPORT_TARGET_VERSION,
		context.ruleId,
		workflow,
	);
	if (!finding) {
		throw new UserError('n8n Assistant cannot open this migration report finding');
	}

	return { workflow: { id: workflow.id, name: workflow.name }, ...finding };
}

function formatAutomatedMigration(outcome: InstanceAiAutomatedMigrationOutcome): string[] {
	const clean = (value: string) => sanitisePromptText(value, FINDING_TEXT_MAX_LENGTH);
	if (outcome.outcome === 'refused') {
		const node = outcome.nodeName ? ` on node "${sanitisePromptText(outcome.nodeName)}"` : '';
		return [
			`The user first ran the automated migration. It refused${node} and changed nothing: ${clean(outcome.message)}`,
			'Make the replacement yourself, and handle what the migration could not carry over.',
		];
	}
	return [
		'The user first ran the automated migration. It replaced the nodes and saved the workflow. Read the workflow again, resolve each item below, and do not replace the nodes again.',
		...outcome.notes.map((note) => `- Note: ${clean(note)}`),
		...outcome.unmapped.map((parameter) => `- Not carried over: ${clean(parameter)}`),
	];
}

/**
 * The opening-turn block of a migration report hand-off: the finding, what the report
 * recommends, and the `v3-migration` skill, so the work starts without a `load_skill` call.
 */
export function buildMigrationReportContextBlock(
	context: InstanceAiMigrationReportHandoffContext,
	finding: MigrationReportFinding,
	skillInstructions: string,
): string {
	const { workflow, rule, issues } = finding;

	const lines = [
		`The user opened this conversation from the n8n ${MIGRATION_REPORT_TARGET_VERSION ?? ''} migration report to resolve one finding in the workflow "${sanitisePromptText(workflow.name)}" (id \`${sanitisePromptText(workflow.id)}\`).`,
		`Finding: ${rule.ruleTitle} (\`${rule.ruleId}\`).`,
		`What changes: ${rule.ruleDescription}`,
		...(issues.length > 0
			? [
					'Affected nodes in the current workflow:',
					...issues.map((issue) => `- ${sanitisePromptText(issue.title, FINDING_TEXT_MAX_LENGTH)}`),
				]
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
		...lines,
		'',
		'<v3-migration-skill>',
		skillInstructions.trim(),
		'</v3-migration-skill>',
		MIGRATION_REPORT_CONTEXT_CLOSE_TAG,
	].join('\n');
}
