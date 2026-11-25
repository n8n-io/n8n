import type {
	BreakingChangeRuleDetailWorkflow,
	MigrationFindingTriageStatus,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref, toValue, type MaybeRefOrGetter } from 'vue';
import { withRestored, withStatuses, type UpdateRows } from '../findingRows';
import { withIds } from '../findingState';

type Row = BreakingChangeRuleDetailWorkflow;

interface FindingTriageOptions {
	ruleId: MaybeRefOrGetter<string>;
	updateRows: UpdateRows;
	isBusy: (workflow: Row) => boolean;
	/** Runs after a won't fix on a single row is saved. */
	onRowWontFix: (workflow: Row) => void;
}

/**
 * Changes the state of findings. The rows change at once and go back as they were
 * when the request fails.
 */
export function useFindingTriage({
	ruleId,
	updateRows,
	isBusy,
	onRowWontFix,
}: FindingTriageOptions) {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();

	// Rows with a state change in flight. One change at a time keeps the revert correct.
	const savingWorkflowIds = ref<Set<string>>(new Set());

	function setSaving(workflowIds: string[], saving: boolean) {
		savingWorkflowIds.value = withIds(savingWorkflowIds.value, workflowIds, saving);
	}

	function showSaveError(error: unknown) {
		toast.showError(error, i18n.baseText('settings.migrationReport.detail.state.error.title'));
	}

	async function onFindingStatusChange(workflow: Row, status: MigrationFindingTriageStatus) {
		if (status === workflow.status || isBusy(workflow)) return;

		updateRows((rows) => withStatuses(rows, new Map([[workflow.id, status]])));
		setSaving([workflow.id], true);
		try {
			await breakingChangesApi.updateFindingStatus(
				rootStore.restApiContext,
				toValue(ruleId),
				workflow.id,
				status,
			);
			if (status === 'wont_fix') onRowWontFix(workflow);
		} catch (error) {
			updateRows((rows) => withRestored(rows, [workflow]));
			showSaveError(error);
		} finally {
			setSaving([workflow.id], false);
		}
	}

	/** Changes the state of all `workflows` in one request. Returns false when the request fails. */
	async function changeFindingStatuses(
		workflows: Row[],
		status: MigrationFindingTriageStatus,
	): Promise<boolean> {
		const workflowIds = workflows.map((workflow) => workflow.id);
		updateRows((rows) =>
			withStatuses(rows, new Map(workflowIds.map((workflowId) => [workflowId, status]))),
		);
		setSaving(workflowIds, true);
		try {
			await breakingChangesApi.updateFindingStatuses(
				rootStore.restApiContext,
				toValue(ruleId),
				workflowIds,
				status,
			);
			return true;
		} catch (error) {
			updateRows((rows) => withRestored(rows, workflows));
			showSaveError(error);
			return false;
		} finally {
			setSaving(workflowIds, false);
		}
	}

	return { savingWorkflowIds, onFindingStatusChange, changeFindingStatuses };
}
