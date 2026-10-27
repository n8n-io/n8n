import type {
	BreakingChangeAssistantAction,
	BreakingChangeRuleImpact,
	BreakingChangeWorkflowRuleResult,
	InstanceAiAutomatedMigrationOutcome,
} from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { useMigrationReportAssistantHandoff } from '@/features/ai/instanceAi/composables/useMigrationReportAssistantHandoff';

type AffectedWorkflow = BreakingChangeWorkflowRuleResult['affectedWorkflows'][number];

/** How the finding row offers the Assistant: to fix the workflow, or to review a behavior change. */
export type MigrationAssistantAction = Exclude<BreakingChangeAssistantAction, 'none'>;

/**
 * The Assistant action on a finding row, or undefined when the row has none. The rule
 * declares its action. A rule with an automated migration offers the Assistant only after
 * that migration ran, from its result.
 */
export function rowAssistantAction(rule: {
	migratable: boolean;
	assistantAction: BreakingChangeAssistantAction;
}): MigrationAssistantAction | undefined {
	if (rule.migratable || rule.assistantAction === 'none') return undefined;
	return rule.assistantAction;
}

/** Opens n8n Assistant on one finding of a rule, and tracks the click. */
export function useMigrationFindingAssistant() {
	const handoff = useMigrationReportAssistantHandoff();
	const telemetry = useTelemetry();

	async function open(params: {
		rule: { ruleId: string; ruleTitle: string; ruleImpact: BreakingChangeRuleImpact };
		workflow: AffectedWorkflow;
		automatedMigration?: InstanceAiAutomatedMigrationOutcome;
	}): Promise<void> {
		const { rule, workflow, automatedMigration } = params;
		const outcome = await handoff.start({
			ruleId: rule.ruleId,
			ruleTitle: rule.ruleTitle,
			workflow: { id: workflow.id, name: workflow.name, homeProjectId: workflow.homeProjectId },
			automatedMigration,
		});

		telemetry.track(TELEMETRY_EVENT.MIGRATION_REPORT.USER_OPENED_MIGRATION_FINDING_IN_ASSISTANT, {
			rule_id: rule.ruleId,
			workflow_id: workflow.id,
			impact: rule.ruleImpact,
			entry_point: automatedMigration ? 'automated_migration_result' : 'finding_row',
			...(automatedMigration ? { automated_migration: automatedMigration.outcome } : {}),
			outcome,
		});
	}

	return { available: handoff.available, open };
}
