import type { ApplyCheckResult, PromotionDirection, PromotionPreview } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, shallowRef, type Ref } from 'vue';
import { useRouter } from 'vue-router';

import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';

import { getPromoteErrorMessage } from '../promoteErrorMessage';
import { promoteProjectSelection } from '../promotions.api';
import { PROMOTION_PREVIEW_VIEWS } from '../promotions.constants';
import { applyProjectSelection, continueApplyProjectSelection } from '../promotionsSettings.api';
import { usePromotionOutcome } from './usePromotionOutcome';

export type OperationRequest = {
	workflowIds: string[];
	/** True when the selection imports a data table change that removes values. */
	confirmDestructiveChanges: boolean;
};

/** Why the page reloaded the preview after an apply that wrote nothing. */
type OperationNotice = 'sourceChanged' | 'newBlockers';

type OperationError = {
	message: string;
	/**
	 * - `rejected`: the server wrote nothing. Users can send the request again.
	 * - `conflict`: the server wrote nothing, but the same request fails again, for example a
	 *   folder conflict of the import. Users must change the instance or the branch first.
	 * - `uncertain`: the operation may have run, for example after a timeout.
	 * - `explained`: the server wrote nothing, and the message names the next step.
	 */
	kind: 'rejected' | 'conflict' | 'uncertain' | 'explained';
};

function errorKind(cause: unknown): Exclude<OperationError['kind'], 'explained'> {
	// The server answers 4xx before it writes anything. Other failures can follow a write.
	const status = cause instanceof ResponseError ? cause.httpStatusCode : undefined;
	if (status === undefined || status >= 500) return 'uncertain';
	return status === 409 || status === 422 ? 'conflict' : 'rejected';
}

/** Runs the promote or the apply of the preview page, and handles its result. */
export function usePromotionOperation(
	projectId: Ref<string>,
	direction: Ref<PromotionDirection>,
	{
		preview,
		check,
		refresh,
	}: {
		preview: Ref<PromotionPreview | null>;
		check: Ref<ApplyCheckResult | null>;
		refresh: () => Promise<void>;
	},
) {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const router = useRouter();
	const message = useMessage();
	const outcome = usePromotionOutcome();

	const phase = ref<'idle' | 'confirming' | 'running'>('idle');
	/** True from the click to the result. The selection does not change in that time. */
	const isBusy = computed(() => phase.value !== 'idle');
	const notice = ref<OperationNotice | null>(null);
	const error = shallowRef<OperationError | null>(null);

	async function confirmApply({ confirmDestructiveChanges }: OperationRequest) {
		// The button already names the data table changes. The dialog says what they remove.
		const answer = confirmDestructiveChanges
			? await message.confirm(
					i18n.baseText('promotions.preview.confirmDestructive.message'),
					i18n.baseText('promotions.preview.confirmDestructive.title'),
					{
						type: 'warning',
						confirmButtonText: i18n.baseText('promotions.bindings.applyDataTableChanges'),
						cancelButtonText: i18n.baseText('generic.cancel'),
					},
				)
			: await message.confirm(
					i18n.baseText('promotions.operation.incoming.confirmSelected.message'),
					i18n.baseText('promotions.operation.incoming.confirmSelected.title'),
					{
						type: 'warning',
						confirmButtonText: i18n.baseText(
							'promotions.operation.incoming.confirmSelected.confirmButtonText',
						),
						cancelButtonText: i18n.baseText('promotions.operation.close'),
					},
				);
		return answer === MODAL_CONFIRM;
	}

	async function leave() {
		// Users can leave while the request runs. Then the page must not move them again.
		if (router.currentRoute.value.name !== PROMOTION_PREVIEW_VIEWS[direction.value]) return;
		await router.replace({
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: projectId.value },
		});
	}

	async function promote({ workflowIds }: OperationRequest) {
		const result = await promoteProjectSelection(rootStore.publicApiContext, projectId.value, {
			workflowIds,
		});
		outcome.showPromoted(projectId.value, result);
		await leave();
	}

	async function apply(request: OperationRequest, source: ApplyCheckResult) {
		// Apply the commit that the page shows. A branch that moved since is reported, not applied.
		const expectedSource = { environmentId: source.environmentId, ...source.git };
		const result = request.confirmDestructiveChanges
			? await continueApplyProjectSelection(rootStore.publicApiContext, projectId.value, {
					workflowIds: request.workflowIds,
					expectedSource,
					confirmDestructiveChanges: true,
				})
			: await applyProjectSelection(rootStore.publicApiContext, projectId.value, {
					workflowIds: request.workflowIds,
					expectedSource,
				});
		if (result.status === 'applied') {
			outcome.showApplied(result);
			await leave();
			await outcome.announceApplied(projectId.value);
			return;
		}
		// Nothing was written. The reloaded preview and check show what changed.
		notice.value = result.status === 'source-changed' ? 'sourceChanged' : 'newBlockers';
		await refresh();
	}

	async function submit(request: OperationRequest) {
		if (isBusy.value || request.workflowIds.length === 0) return;
		const source = check.value;
		if (direction.value === 'apply' && !source) return;
		// Set before the dialog, so a second click does not open another one.
		phase.value = 'confirming';
		try {
			if (direction.value === 'apply' && !(await confirmApply(request))) return;
			phase.value = 'running';
			notice.value = null;
			error.value = null;
			if (direction.value === 'promote') await promote(request);
			else if (source) await apply(request, source);
		} catch (cause) {
			const kind = errorKind(cause);
			const explained =
				direction.value === 'promote'
					? getPromoteErrorMessage(cause, preview.value?.changes ?? [], i18n)
					: undefined;
			error.value = explained
				? { message: explained, kind: 'explained' }
				: { message: cause instanceof Error ? cause.message : String(cause), kind };
			// The reloaded preview shows what the page knows about the cause, such as a moved folder.
			if (kind !== 'rejected') await refresh();
		} finally {
			phase.value = 'idle';
		}
	}

	return {
		isBusy,
		isRunning: computed(() => phase.value === 'running'),
		notice,
		error,
		submit,
	};
}
