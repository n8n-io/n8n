import {
	MIGRATION_REPORT_TARGET_VERSION,
	type InstanceAiAutomatedMigrationOutcome,
	type InstanceAiHandoffContext,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

import { useInstanceAiAvailable } from './useInstanceAiAvailability';
import {
	ensurePersonalProjectId,
	useInstanceAiHandoff,
	type InstanceAiHandoffOutcome,
} from './useInstanceAiHandoff';

/** One migration report finding: a workflow and the rule it breaks. */
export interface MigrationReportFindingInput {
	ruleId: string;
	ruleTitle: string;
	workflow: { id: string; name: string; homeProjectId?: string };
	/** What an automated migration left behind, when the user ran one first. */
	automatedMigration?: InstanceAiAutomatedMigrationOutcome;
}

/** Clamps migration display text to the hand-off schema's limits, so a long note never fails the send. */
function toHandoffOutcome(
	outcome: InstanceAiAutomatedMigrationOutcome,
): InstanceAiAutomatedMigrationOutcome {
	const clamp = (values: string[], maxLength: number) =>
		values
			.filter((value) => value.trim())
			.slice(0, 50)
			.map((value) => value.slice(0, maxLength));
	if (outcome.outcome === 'refused') {
		return {
			outcome: 'refused',
			message: outcome.message.slice(0, 1000),
			...(outcome.nodeName ? { nodeName: outcome.nodeName.slice(0, 255) } : {}),
		};
	}
	return {
		outcome: 'partial',
		notes: clamp(outcome.notes, 1000),
		unmapped: clamp(outcome.unmapped, 500),
	};
}

/**
 * Opens n8n Assistant in a new tab to fix one migration report finding, so the
 * report stays open as the user's work list. The server reads the rule and the
 * workflow's current issues itself; the opener only names them.
 */
export function useMigrationReportAssistantHandoff() {
	const available = useInstanceAiAvailable();
	const { startThread } = useInstanceAiHandoff();
	const i18n = useI18n();

	async function start(
		finding: MigrationReportFindingInput,
	): Promise<InstanceAiHandoffOutcome | 'unavailable'> {
		if (!available.value) return 'unavailable';

		const projectId = finding.workflow.homeProjectId ?? (await ensurePersonalProjectId());
		if (!projectId) return 'failed';

		const context: InstanceAiHandoffContext = {
			source: 'migration-report',
			ruleId: finding.ruleId,
			workflowId: finding.workflow.id,
			...(finding.automatedMigration
				? { automatedMigration: toHandoffOutcome(finding.automatedMigration) }
				: {}),
		};
		const interpolate = {
			ruleTitle: finding.ruleTitle,
			version: MIGRATION_REPORT_TARGET_VERSION ?? '',
		};
		const message = finding.automatedMigration
			? i18n.baseText('instanceAi.migrationReport.prompt.afterAutomatedMigration', { interpolate })
			: i18n.baseText('instanceAi.migrationReport.prompt', { interpolate });

		return await startThread(
			projectId,
			message,
			{ kind: 'prefill', prefillType: 'handoff_migration_report' },
			{
				source: 'migration_report',
				origin: 'internal',
				sourceContext: {
					ruleId: finding.ruleId,
					...(finding.automatedMigration
						? { automatedMigration: finding.automatedMigration.outcome }
						: {}),
				},
			},
			[{ type: 'workflow', id: finding.workflow.id, name: finding.workflow.name }],
			undefined,
			{ newTab: true, context },
		);
	}

	return { available, start };
}
