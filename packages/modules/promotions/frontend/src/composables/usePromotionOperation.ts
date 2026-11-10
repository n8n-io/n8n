import type { PromotionDirection, PromotionPreview } from '@n8n/api-types';
import { useMessage } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, shallowRef, type Ref } from 'vue';
import { useRouter } from 'vue-router';

import { getPromoteErrorMessage } from '../promoteErrorMessage';
import type { OperationSelection } from '../promotionOperation';
import {
	applyProjectSelection,
	continueApplyProjectSelection,
	promoteProjectSelection,
} from '../promotions.api';
import {
	PROMOTION_INSTANCE_APPLY_VIEW,
	PROMOTION_PREVIEW_VIEWS,
	PROMOTIONS_SETTINGS_VIEW,
} from '../promotions.constants';
import { applyPromotion, continueApplyPromotion } from '../promotionsSettings.api';
import type { ApplyCheckResult } from '../promotions.types';
import { usePromotionOutcome } from './usePromotionOutcome';

export type OperationRequest = OperationSelection & {
	/** True when the selection imports a data table change that removes values. */
	confirmDestructiveChanges: boolean;
	/** Whole-instance Apply only: the names of the projects that it deletes. */
	deletedProjects?: string[];
	/** Promote only. When it is missing, the backend generates the message. */
	commitMessage?: string;
};

/** Why the page reloaded the preview after an apply that wrote nothing. */
type OperationNotice = 'sourceChanged' | 'instanceChanged' | 'newBlockers';

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

/**
 * Runs the promote or the apply of the preview page, and handles its result. Without a project,
 * it applies the whole instance.
 */
export function usePromotionOperation(
	projectId: Ref<string | undefined>,
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

	async function confirmApply({
		confirmDestructiveChanges,
		deletedProjects = [],
	}: OperationRequest) {
		if (deletedProjects.length > 0) {
			const deletion = i18n.baseText('promotions.preview.confirmProjectDeletion.message', {
				adjustToNumber: deletedProjects.length,
				interpolate: { projects: deletedProjects.map((name) => `"${name}"`).join(', ') },
			});
			const answer = await message.confirm(
				confirmDestructiveChanges
					? `${deletion} ${i18n.baseText('promotions.preview.confirmProjectDeletion.dataTables')}`
					: deletion,
				i18n.baseText('promotions.preview.confirmProjectDeletion.title'),
				{
					type: 'warning',
					confirmButtonText: i18n.baseText('promotions.preview.confirmProjectDeletion.confirm'),
					cancelButtonText: i18n.baseText('generic.cancel'),
				},
			);
			return answer === 'confirm';
		}
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
					projectId.value === undefined
						? i18n.baseText('promotions.preview.confirmInstance.message')
						: i18n.baseText('promotions.operation.incoming.confirmSelected.message'),
					projectId.value === undefined
						? i18n.baseText('promotions.preview.confirmInstance.title')
						: i18n.baseText('promotions.operation.incoming.confirmSelected.title'),
					{
						type: 'warning',
						confirmButtonText: i18n.baseText(
							'promotions.operation.incoming.confirmSelected.confirmButtonText',
						),
						cancelButtonText: i18n.baseText('promotions.operation.close'),
					},
				);
		return answer === 'confirm';
	}

	async function leave() {
		const id = projectId.value;
		const page =
			id === undefined ? PROMOTION_INSTANCE_APPLY_VIEW : PROMOTION_PREVIEW_VIEWS[direction.value];
		// Users can leave while the request runs. Then the page must not move them again.
		if (router.currentRoute.value.name !== page) return;
		await router.replace(
			id === undefined
				? { name: PROMOTIONS_SETTINGS_VIEW }
				: { name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: id } },
		);
	}

	async function promote(id: string, { workflowIds, folderIds, commitMessage }: OperationRequest) {
		const result = await promoteProjectSelection(rootStore.publicApiContext, id, {
			workflowIds,
			folderIds,
			...(commitMessage && { commitMessage }),
		});
		outcome.showPromoted(id, result);
		await leave();
	}

	async function reportUnapplied(status: 'source-changed' | 'preview-changed' | 'blocked') {
		// Nothing was written. The reloaded preview and check show what changed.
		const notices = {
			'source-changed': 'sourceChanged',
			'preview-changed': 'instanceChanged',
			blocked: 'newBlockers',
		} as const;
		notice.value = notices[status];
		await refresh();
	}

	async function applyProject(id: string, request: OperationRequest, source: ApplyCheckResult) {
		// Apply what the page shows. A branch or an instance that changed since is reported, not applied.
		const expected = {
			workflowIds: request.workflowIds,
			folderIds: request.folderIds,
			expectedSource: { environmentId: source.environmentId, ...source.git },
			expectedPreviewRevision: preview.value?.revision,
		};
		const result = request.confirmDestructiveChanges
			? await continueApplyProjectSelection(rootStore.publicApiContext, id, {
					...expected,
					confirmDestructiveChanges: true,
				})
			: await applyProjectSelection(rootStore.publicApiContext, id, expected);
		if (result.status === 'applied') {
			outcome.showApplied(result);
			await leave();
			await outcome.announceApplied(id);
			return;
		}
		await reportUnapplied(result.status);
	}

	async function applyInstance(request: OperationRequest, source: ApplyCheckResult) {
		const expected = {
			expectedSource: { environmentId: source.environmentId, ...source.git },
			expectedPreviewRevision: preview.value?.revision,
		};
		// Project deletions and destructive data table changes need the confirmation of Continue.
		const confirm = request.confirmDestructiveChanges || !!request.deletedProjects?.length;
		const result = confirm
			? await continueApplyPromotion(rootStore.publicApiContext, source.environmentId, {
					...expected,
					confirmDestructiveChanges: true,
				})
			: await applyPromotion(rootStore.publicApiContext, source.environmentId, expected);
		if (result.status === 'applied') {
			outcome.showInstanceApplied(result);
			await leave();
			await outcome.refreshProjects();
			return;
		}
		await reportUnapplied(result.status);
	}

	async function submit(request: OperationRequest) {
		// The page enables the submit only with a selection. A project-only selection sends no ids.
		if (isBusy.value) return;
		const source = check.value;
		if (direction.value === 'apply' && !source) return;
		// Set before the dialog, so a second click does not open another one.
		phase.value = 'confirming';
		try {
			if (direction.value === 'apply' && !(await confirmApply(request))) return;
			phase.value = 'running';
			notice.value = null;
			error.value = null;
			const id = projectId.value;
			if (direction.value === 'promote') {
				if (id !== undefined) await promote(id, request);
			} else if (source) {
				if (id === undefined) await applyInstance(request, source);
				else await applyProject(id, request, source);
			}
		} catch (cause) {
			const kind = errorKind(cause);
			const explained =
				direction.value === 'promote'
					? getPromoteErrorMessage(cause, preview.value?.resources ?? [], i18n)
					: undefined;
			error.value = explained
				? { message: explained, kind: 'explained' }
				: { message: cause instanceof Error ? cause.message : String(cause), kind };
			// The reloaded preview shows what the page knows about the cause, such as a moved folder.
			if (kind !== 'rejected') await refresh();
			// A failed instance Apply can stop after it created or deleted projects.
			if (kind === 'uncertain' && projectId.value === undefined) await outcome.refreshProjects();
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
