import type {
	BreakingChangeRuleDetailResult,
	BreakingChangeRuleDetailWorkflow,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { ref, toValue, type MaybeRefOrGetter } from 'vue';
import { needsArchiveConfirmation, shouldPromptToArchive } from '../bulkTargets';
import type { ArchiveWorkflowsModalMode } from '../constants';
import { withArchived, type UpdateRows } from '../findingRows';
import type { FindingState } from '../findingState';

type Row = BreakingChangeRuleDetailWorkflow;

interface ArchiveFlowOptions {
	ruleImpact: MaybeRefOrGetter<BreakingChangeRuleDetailResult['ruleImpact']>;
	updateRows: UpdateRows;
	stateOf: (workflow: Row) => FindingState;
	/** Marks `workflows` as won't fix in one request. Returns false when the request fails. */
	markWontFix: (workflows: Row[]) => Promise<boolean>;
	/** Runs when a bulk archive starts, with the ids of its workflows. */
	onBulkArchiveStart: (workflowIds: string[]) => void;
}

/** Archives workflows after a won't fix, from a prompt on one row or a bulk action. */
export function useArchiveFlow({
	ruleImpact,
	updateRows,
	stateOf,
	markWontFix,
	onBulkArchiveStart,
}: ArchiveFlowOptions) {
	const i18n = useI18n();
	const toast = useToast();
	const workflowsStore = useWorkflowsStore();

	// The open archive dialog, if any.
	const archiveDialog = ref<{ mode: ArchiveWorkflowsModalMode; workflows: Row[] }>();

	function promptToArchive(workflow: Row) {
		if (!shouldPromptToArchive(toValue(ruleImpact), workflow)) return;
		archiveDialog.value = { mode: 'prompt', workflows: [workflow] };
	}

	function startBulkArchive(workflows: Row[]) {
		if (workflows.length === 0) return;
		if (!needsArchiveConfirmation(workflows)) {
			void markWontFixAndArchive(workflows);
			return;
		}
		archiveDialog.value = { mode: 'confirm', workflows };
	}

	function onArchiveDialogConfirm() {
		if (!archiveDialog.value) return;
		const { mode, workflows } = archiveDialog.value;
		void (mode === 'prompt' ? archiveWorkflows(workflows) : markWontFixAndArchive(workflows));
	}

	function closeArchiveDialog() {
		archiveDialog.value = undefined;
	}

	async function markWontFixAndArchive(workflows: Row[]) {
		const toMark = workflows.filter((workflow) => stateOf(workflow) !== 'wont_fix');
		if (toMark.length > 0 && !(await markWontFix(toMark))) return;
		onBulkArchiveStart(workflows.map((workflow) => workflow.id));
		await archiveWorkflows(workflows);
	}

	async function archiveWorkflows(workflows: Row[]) {
		const count = workflows.length;
		// One request per workflow. A bulk archive endpoint would be faster for large selections.
		const archivedIds = new Set<string>();
		for (const workflow of workflows) {
			try {
				await workflowsStore.archiveWorkflow(workflow.id);
				archivedIds.add(workflow.id);
			} catch {
				// Counted below. The user may triage a workflow without the right to archive it.
			}
		}

		updateRows((rows) => withArchived(rows, archivedIds));

		if (archivedIds.size === count) {
			toast.showMessage({
				type: 'success',
				title: i18n.baseText('settings.migrationReport.detail.wontFix.archive.success.title', {
					adjustToNumber: count,
					interpolate: { count: String(count) },
				}),
			});
		} else {
			toast.showMessage({
				type: 'warning',
				title: i18n.baseText('settings.migrationReport.detail.wontFix.archive.partial.title', {
					interpolate: { archived: String(archivedIds.size), total: String(count) },
				}),
				message: i18n.baseText('settings.migrationReport.detail.wontFix.archive.partial.message'),
			});
		}
	}

	return {
		archiveDialog,
		promptToArchive,
		startBulkArchive,
		onArchiveDialogConfirm,
		closeArchiveDialog,
	};
}
