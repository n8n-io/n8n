import {
	MIGRATION_REPORT_TARGET_VERSION,
	type BreakingChangeWorkflowRuleResult,
	type InstanceAiAutomatedMigrationOutcome,
} from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import {
	ensurePersonalProjectId,
	useInstanceAiHandoff,
} from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';

type AffectedWorkflow = BreakingChangeWorkflowRuleResult['affectedWorkflows'][number];

/**
 * Opens n8n Assistant in a new tab on one finding, so the report stays open as the user's
 * work list, and tracks the click. The server reads the rule and the workflow's issues itself.
 */
export function useMigrationFindingAssistant() {
	const available = useInstanceAiAvailable();
	const { startThread } = useInstanceAiHandoff();
	const telemetry = useTelemetry();
	const i18n = useI18n();

	async function open({
		rule,
		workflow,
		automatedMigration,
	}: {
		rule: { ruleId: string; ruleTitle: string };
		workflow: AffectedWorkflow;
		automatedMigration?: InstanceAiAutomatedMigrationOutcome;
	}): Promise<void> {
		const projectId = workflow.homeProjectId ?? (await ensurePersonalProjectId());
		const outcome = projectId
			? await startThread(
					projectId,
					i18n.baseText('instanceAi.migrationReport.prompt', {
						interpolate: {
							ruleTitle: rule.ruleTitle,
							version: MIGRATION_REPORT_TARGET_VERSION ?? '',
						},
					}),
					{ kind: 'prefill', prefillType: 'handoff_migration_report' },
					{
						source: 'migration_report',
						origin: 'internal',
						sourceContext: {
							ruleId: rule.ruleId,
							...(automatedMigration ? { automatedMigration: automatedMigration.outcome } : {}),
						},
					},
					[{ type: 'workflow', id: workflow.id, name: workflow.name }],
					undefined,
					{
						newTab: true,
						context: {
							source: 'migration-report',
							ruleId: rule.ruleId,
							workflowId: workflow.id,
							...(automatedMigration ? { automatedMigration } : {}),
						},
					},
				)
			: 'failed';

		telemetry.track(TELEMETRY_EVENT.MIGRATION_REPORT.USER_OPENED_MIGRATION_FINDING_IN_ASSISTANT, {
			rule_id: rule.ruleId,
			workflow_id: workflow.id,
			...(automatedMigration ? { automated_migration: automatedMigration.outcome } : {}),
			outcome,
		});
	}

	return { available, open };
}
