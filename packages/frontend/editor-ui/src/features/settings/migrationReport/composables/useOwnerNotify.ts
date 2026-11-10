import type {
	BreakingChangeRuleDetailWorkflow,
	MigrationNotifyResult,
	MigrationNotifySkipReason,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref, toValue, type MaybeRefOrGetter } from 'vue';
import { withNotified, type UpdateRows } from '../findingRows';
import { withIds } from '../findingState';
import { ownerLabel } from '../workflowLabels';

type Row = BreakingChangeRuleDetailWorkflow;

const skipReasonKeys: Record<
	MigrationNotifySkipReason,
	| 'settings.migrationReport.detail.notify.skipped.noOwner'
	| 'settings.migrationReport.detail.notify.skipped.noFinding'
	| 'settings.migrationReport.detail.notify.skipped.sendFailed'
	| 'settings.migrationReport.detail.notify.skipped.recentlyNotified'
> = {
	no_owner: 'settings.migrationReport.detail.notify.skipped.noOwner',
	no_finding: 'settings.migrationReport.detail.notify.skipped.noFinding',
	send_failed: 'settings.migrationReport.detail.notify.skipped.sendFailed',
	recently_notified: 'settings.migrationReport.detail.notify.skipped.recentlyNotified',
};

interface OwnerNotifyOptions {
	ruleId: MaybeRefOrGetter<string>;
	updateRows: UpdateRows;
	isBusy: (workflow: Row) => boolean;
}

/** Emails the owners of findings and marks the notified rows. */
export function useOwnerNotify({ ruleId, updateRows, isBusy }: OwnerNotifyOptions) {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();

	// Rows with a notification in flight. Its response sets the status, so a state
	// change must wait for it.
	const notifyingWorkflowIds = ref<Set<string>>(new Set());

	/** Emails the owners of `workflows` in one request. Returns undefined when the request fails. */
	async function notifyOwners(workflows: Row[]): Promise<MigrationNotifyResult | undefined> {
		const workflowIds = workflows.map((workflow) => workflow.id);
		notifyingWorkflowIds.value = withIds(notifyingWorkflowIds.value, workflowIds, true);
		try {
			const result = await breakingChangesApi.notifyFindingOwners(
				rootStore.restApiContext,
				toValue(ruleId),
				workflowIds,
			);
			updateRows((rows) => withNotified(rows, result.notifiedWorkflowIds, new Date()));
			return result;
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.migrationReport.detail.notify.error.title'));
			return undefined;
		} finally {
			notifyingWorkflowIds.value = withIds(notifyingWorkflowIds.value, workflowIds, false);
		}
	}

	/** Emails the owner of one workflow. A second call on a notified row is a reminder. */
	async function onNotify(workflow: Row) {
		if (isBusy(workflow)) return;
		const result = await notifyOwners([workflow]);
		if (!result) return;

		const skipped = result.skipped.find((entry) => entry.workflowId === workflow.id);
		if (skipped) {
			toast.showMessage({
				type: 'error',
				title: i18n.baseText('settings.migrationReport.detail.notify.error.title'),
				message: i18n.baseText(skipReasonKeys[skipped.reason]),
			});
			return;
		}
		const owner = ownerLabel(
			workflow,
			i18n.baseText('settings.migrationReport.detail.table.unassigned'),
		);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.migrationReport.detail.notify.success.title'),
			message: i18n.baseText('settings.migrationReport.detail.notify.success.message', {
				interpolate: { owner, name: workflow.name },
			}),
		});
	}

	/** Emails the owners of `workflows`. Returns the ids of the notified workflows. */
	async function notifyMany(workflows: Row[]): Promise<string[]> {
		if (workflows.length === 0) return [];
		const result = await notifyOwners(workflows);
		if (!result) return [];

		const notifiedCount = result.notifiedWorkflowIds.length;
		if (result.skipped.length > 0) {
			const reasons = new Set(result.skipped.map((entry) => entry.reason));
			toast.showMessage({
				type: 'warning',
				title: i18n.baseText('settings.migrationReport.detail.bulk.notify.partial.title', {
					interpolate: { notified: String(notifiedCount), total: String(workflows.length) },
				}),
				message: [...reasons].map((reason) => i18n.baseText(skipReasonKeys[reason])).join('. '),
			});
		} else {
			toast.showMessage({
				type: 'success',
				title: i18n.baseText('settings.migrationReport.detail.bulk.notify.success.title', {
					adjustToNumber: notifiedCount,
					interpolate: { count: String(notifiedCount) },
				}),
			});
		}
		return result.notifiedWorkflowIds;
	}

	return { notifyingWorkflowIds, onNotify, notifyMany };
}
