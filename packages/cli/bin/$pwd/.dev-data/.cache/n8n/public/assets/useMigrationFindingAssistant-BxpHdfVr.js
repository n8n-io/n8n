import { It as useInstanceAiHandoff, Tt as ensurePersonalProjectId, ad as useInstanceAiAvailable, hC as useTelemetry, jN as useI18n, vm as useProjectsStore, wy as TELEMETRY_EVENT } from "./app-D5flEmb-.js";
//#region src/features/settings/migrationReport/useMigrationFindingAssistant.ts
/**
* The workflow's home project when the user is a member of it, else their personal project.
* A shared workflow can live in a project where the user cannot start a thread.
*/
async function threadProjectId(homeProjectId) {
	const projectsStore = useProjectsStore();
	if (homeProjectId) {
		if (projectsStore.myProjects.length === 0) await projectsStore.getMyProjects().catch(() => {});
		if (projectsStore.myProjects.some((project) => project.id === homeProjectId)) return homeProjectId;
	}
	return await ensurePersonalProjectId();
}
/**
* Opens n8n Assistant in a new tab on one finding, so the report stays open as the user's
* work list, and tracks the click. The server reads the rule and the workflow's issues itself.
*/
function useMigrationFindingAssistant() {
	const available = useInstanceAiAvailable();
	const { startThread } = useInstanceAiHandoff();
	const telemetry = useTelemetry();
	const i18n = useI18n();
	async function open({ rule, workflow, action, automatedMigration }) {
		const projectId = await threadProjectId(workflow.homeProjectId);
		const outcome = projectId ? await startThread(projectId, i18n.baseText("instanceAi.migrationReport.prompt", { interpolate: {
			ruleTitle: rule.ruleTitle,
			version: "v3"
		} }), {
			kind: "prefill",
			prefillType: "handoff_migration_report"
		}, {
			source: "migration_report",
			origin: "internal",
			sourceContext: {
				ruleId: rule.ruleId,
				...automatedMigration ? { automatedMigration: automatedMigration.outcome } : {}
			}
		}, [{
			type: "workflow",
			id: workflow.id,
			name: workflow.name
		}], void 0, {
			newTab: true,
			context: {
				source: "migration-report",
				ruleId: rule.ruleId,
				workflowId: workflow.id,
				...automatedMigration ? { automatedMigration } : {}
			}
		}) : "failed";
		telemetry.track(TELEMETRY_EVENT.MIGRATION_REPORT.USER_OPENED_MIGRATION_FINDING_IN_ASSISTANT, {
			rule_id: rule.ruleId,
			workflow_id: workflow.id,
			action,
			...automatedMigration ? { automated_migration: automatedMigration.outcome } : {},
			outcome
		});
	}
	return {
		available,
		open
	};
}
//#endregion
export { useMigrationFindingAssistant as t };
