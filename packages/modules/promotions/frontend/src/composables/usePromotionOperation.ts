import type {
	ApplyPackageResultDto,
	PromoteSelectionResultDto,
	PromotionDependencyReport,
	PromotionDirection,
	PromotionEnvironmentSelectionProject,
	PromotionPreview,
} from '@n8n/api-types';
import { useMessage } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, shallowRef, type Ref } from 'vue';
import { useRouter } from 'vue-router';

import { getPromoteErrorMessage } from '../promoteErrorMessage';
import type { DependencyConfirmationPayload } from '../promotionDependencies';
import { isLockedError } from '../promotionErrors';
import { loadPromotionFixture } from '../promotionFixtures';
import type { OperationSelection } from '../promotionOperation';
import {
	applyEnvironmentSelection,
	applyProjectSelection,
	continueApplyEnvironmentSelection,
	continueApplyProjectSelection,
	promoteEnvironmentSelection,
	promoteProjectSelection,
} from '../promotions.api';
import {
	PROMOTION_ENVIRONMENT_VIEWS,
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
	/** Changes view only: the selection of each project. */
	projects?: PromotionEnvironmentSelectionProject[];
	/**
	 * Changes view of an Apply only: the selection holds every change, so the Apply of the whole
	 * instance runs. Only that Apply deletes projects.
	 */
	wholeInstance?: boolean;
	/** The gaps and the other items of the dependency report that the user accepted. */
	confirmations?: DependencyConfirmationPayload;
	/** True when the user already confirmed the operation in the dialog of the gaps. */
	confirmed?: boolean;
};

/** Why the page reloaded the preview after an operation that wrote nothing. */
type OperationNotice =
	| 'sourceChanged'
	| 'instanceChanged'
	| 'projectChanged'
	| 'newBlockers'
	| 'gapsChanged';

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
 * it runs the selection of the changes view, across projects.
 */
export function usePromotionOperation(
	projectId: Ref<string | undefined>,
	direction: Ref<PromotionDirection>,
	{
		preview,
		check,
		refresh,
		environmentId,
		origin,
		fixture,
	}: {
		preview: Ref<PromotionPreview | null>;
		check: Ref<ApplyCheckResult | null>;
		refresh: () => Promise<void>;
		/** The environment of the changes view. */
		environmentId?: Ref<string | undefined>;
		/** Only for the changes view: the project page that the user came from. */
		origin?: Ref<string | undefined>;
		/** Development only: the name of a fixture that replaces the server. */
		fixture?: Ref<string | undefined>;
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
	/**
	 * The report of an operation that stopped because the gaps changed. It describes the exact
	 * selection of that request, so the page shows it until the selection changes.
	 */
	const gapsReport = shallowRef<PromotionDependencyReport | null>(null);

	async function confirmApply({
		confirmDestructiveChanges,
		deletedProjects = [],
		wholeInstance,
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
					wholeInstance
						? i18n.baseText('promotions.preview.confirmInstance.message')
						: i18n.baseText('promotions.operation.incoming.confirmSelected.message'),
					wholeInstance
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
			id === undefined
				? PROMOTION_ENVIRONMENT_VIEWS[direction.value]
				: PROMOTION_PREVIEW_VIEWS[direction.value];
		// Users can leave while the request runs. Then the page must not move them again.
		if (router.currentRoute.value.name !== page) return;
		// The changes view goes back to where it was opened: a project, or the settings page.
		const backTo = id ?? origin?.value;
		await router.replace(
			backTo === undefined
				? { name: PROMOTIONS_SETTINGS_VIEW }
				: { name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: backTo } },
		);
	}

	async function onPromoted(result: PromoteSelectionResultDto, projectIds: string[]) {
		if (result.status === 'gaps-changed') {
			// Nothing was pushed. The report holds the gaps that the user must review.
			gapsReport.value = result.dependencyReport;
			notice.value = 'gapsChanged';
			await refresh();
			return;
		}
		if (result.status === 'preview-changed') {
			notice.value = 'projectChanged';
			await refresh();
			return;
		}
		outcome.showPromoted(projectIds, result);
		await leave();
	}

	async function promote(request: OperationRequest) {
		const { workflowIds, folderIds, commitMessage, projects, confirmations } = request;
		// Promote what the page shows. A project or branch that changed since is reported, not pushed.
		const shared = {
			...(commitMessage && { commitMessage }),
			expectedPreviewRevision: preview.value?.revision,
			...(confirmations?.confirmedGapIds && { confirmedGapIds: confirmations.confirmedGapIds }),
		};
		const confirmedGapIds = confirmations?.confirmedGapIds ?? [];
		const id = projectId.value;
		if (fixture?.value) {
			const result = (
				await loadPromotionFixture(fixture.value, 'promote', id ?? origin?.value)
			).promote(confirmedGapIds);
			await onPromoted(result, id === undefined ? (projects ?? []).map((p) => p.projectId) : [id]);
			return;
		}
		if (id !== undefined) {
			const result = await promoteProjectSelection(rootStore.publicApiContext, id, {
				workflowIds,
				folderIds,
				...shared,
			});
			await onPromoted(result, [id]);
			return;
		}
		if (!environmentId?.value || !projects?.length) return;
		const result = await promoteEnvironmentSelection(
			rootStore.publicApiContext,
			environmentId.value,
			{ projects, ...shared },
		);
		await onPromoted(
			result,
			projects.map((project) => project.projectId),
		);
	}

	async function onApplied(result: ApplyPackageResultDto, acrossProjects: boolean) {
		if (result.status === 'applied') {
			const id = projectId.value;
			if (id !== undefined) {
				outcome.showApplied(result);
				await leave();
				await outcome.announceApplied(id);
				return;
			}
			outcome.showInstanceApplied(result);
			await leave();
			if (acrossProjects) await outcome.refreshProjects();
			return;
		}
		if (result.status === 'gaps-changed') gapsReport.value = result.dependencyReport;
		// Nothing was written. The reloaded preview and check show what changed.
		const notices = {
			'source-changed': 'sourceChanged',
			'preview-changed': 'instanceChanged',
			blocked: 'newBlockers',
			'gaps-changed': 'gapsChanged',
		} as const;
		notice.value = notices[result.status];
		await refresh();
	}

	async function apply(request: OperationRequest, source: ApplyCheckResult) {
		// Apply what the page shows. A branch or an instance that changed since is reported, not applied.
		const expected = {
			expectedSource: { environmentId: source.environmentId, ...source.git },
			expectedPreviewRevision: preview.value?.revision,
			...request.confirmations,
		};
		const context = rootStore.publicApiContext;
		const id = projectId.value;
		if (fixture?.value) {
			const result = (
				await loadPromotionFixture(fixture.value, 'apply', id ?? origin?.value)
			).apply(request.confirmations?.confirmedGapIds ?? []);
			await onApplied(result, false);
			return;
		}
		if (id !== undefined) {
			const selection = { workflowIds: request.workflowIds, folderIds: request.folderIds };
			const result = request.confirmDestructiveChanges
				? await continueApplyProjectSelection(context, id, {
						...selection,
						...expected,
						confirmDestructiveChanges: true,
					})
				: await applyProjectSelection(context, id, { ...selection, ...expected });
			await onApplied(result, false);
			return;
		}
		if (request.wholeInstance) {
			// Project deletions and destructive data table changes need the confirmation of Continue.
			const confirm = request.confirmDestructiveChanges || !!request.deletedProjects?.length;
			const result = confirm
				? await continueApplyPromotion(context, source.environmentId, {
						...expected,
						confirmDestructiveChanges: true,
					})
				: await applyPromotion(context, source.environmentId, expected);
			await onApplied(result, true);
			return;
		}
		if (!request.projects?.length) return;
		const payload = { projects: request.projects, ...expected };
		const result = request.confirmDestructiveChanges
			? await continueApplyEnvironmentSelection(context, source.environmentId, {
					...payload,
					confirmDestructiveChanges: true,
				})
			: await applyEnvironmentSelection(context, source.environmentId, payload);
		await onApplied(result, true);
	}

	async function submit(request: OperationRequest) {
		// The page enables the submit only with a selection. A project-only selection sends no ids.
		if (isBusy.value) return;
		const source = check.value;
		if (direction.value === 'apply' && !source) return;
		// Set before the dialog, so a second click does not open another one.
		phase.value = 'confirming';
		try {
			// The dialog of the gaps confirms the Apply. A deletion or a destructive change still
			// gets its own question.
			const needsQuestion =
				!request.confirmed ||
				request.confirmDestructiveChanges ||
				!!request.deletedProjects?.length;
			if (direction.value === 'apply' && needsQuestion && !(await confirmApply(request))) return;
			phase.value = 'running';
			notice.value = null;
			error.value = null;
			gapsReport.value = null;
			if (direction.value === 'promote') await promote(request);
			else if (source) await apply(request, source);
		} catch (cause) {
			const kind = errorKind(cause);
			const explained =
				direction.value === 'promote'
					? getPromoteErrorMessage(cause, preview.value?.resources ?? [], i18n)
					: undefined;
			error.value = explained
				? { message: explained, kind: 'explained' }
				: {
						message: isLockedError(cause)
							? i18n.baseText('promotions.bindings.error.locked')
							: cause instanceof Error
								? cause.message
								: String(cause),
						kind,
					};
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
		gapsReport,
		submit,
	};
}
