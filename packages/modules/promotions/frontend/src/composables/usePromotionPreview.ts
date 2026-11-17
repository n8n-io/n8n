import type { PromotionDirection, PromotionPreview, PromotionProviderType } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, shallowRef, watch, type Ref } from 'vue';

import { useLatestFetch } from '@n8n/composables/useLatestFetch';

import { getPromotionEnvironmentChanges, getPromotionPreview } from '../promotions.api';
import type { ApplyCheckResult } from '../promotions.types';
import { buildSelectionGraph } from '../promotionPreview.selection';
import { repositoryDisplayName } from '../promotionsSettings.utils';
import { useInstancePromotionConnection } from './useInstancePromotionConnection';
import { usePromotionProjectEnvironments } from './usePromotionProjectEnvironments';

/**
 * What the preview page needs to know about its environment. A project page reads it from the
 * project lookup, which also serves a project admin. The instance page reads the full list.
 */
export type PromotionPreviewEnvironment = {
	id: string;
	name: string;
	direction: PromotionDirection;
	providerType: PromotionProviderType;
	/** The base branch of a Promote, or the branch of an Apply. */
	branchName: string;
	createBranchOnPromotion: boolean;
	allowIncomplete: boolean;
};

type PromotionPreviewState =
	| 'loading'
	/** The connection lookup failed. This is not the same as "no connection". */
	| 'connectionFailed'
	/** The instance has no environment for this direction. */
	| 'disconnected'
	| 'error'
	/** An open review holds the changes, so the preview lists none. */
	| 'blocked'
	| 'empty'
	| 'ready';

/**
 * Loads the preview of one project and direction for the preview page. Without a project, it
 * loads the Apply of the whole instance. On Apply, the preview also holds the blockers, so both
 * describe the same source.
 */
export function usePromotionPreview(
	projectId: Ref<string | undefined>,
	direction: Ref<PromotionDirection>,
) {
	const rootStore = useRootStore();
	const { next } = useLatestFetch();
	const {
		environments,
		failed: connectionFailed,
		load: loadConnection,
	} = useInstancePromotionConnection();
	const {
		environments: projectEnvironments,
		failed: projectLookupFailed,
		load: loadProjectEnvironments,
	} = usePromotionProjectEnvironments();
	/** False when the user may not run the operation in the project. */
	const canOperate = ref(true);

	const state = ref<PromotionPreviewState>('loading');
	const preview = shallowRef<PromotionPreview | null>(null);
	const refreshing = ref(false);
	/** True when a refresh failed. The page keeps the last preview and says so. */
	const refreshFailed = ref(false);
	const lastRefreshedAt = ref<Date | null>(null);
	/** The Apply check. `null` on Promote, and when the branch has no commit yet. */
	const check = computed<ApplyCheckResult | null>(() => {
		const result = preview.value;
		return result?.check && result.commitSha
			? {
					environmentId: result.source.environmentId,
					git: { commitSha: result.commitSha, branchName: result.source.branchName },
					...result.check,
				}
			: null;
	});
	const graph = computed(() =>
		preview.value ? buildSelectionGraph(preview.value, direction.value) : null,
	);
	const instanceEnvironment = computed(
		() => environments.value.find((candidate) => candidate.direction === direction.value) ?? null,
	);
	const environment = computed((): PromotionPreviewEnvironment | null => {
		if (projectId.value !== undefined) {
			const found = projectEnvironments.value[direction.value];
			if (!found) return null;
			return {
				id: found.id,
				name: found.name,
				direction: direction.value,
				providerType: found.providerType,
				branchName: found.branchName,
				createBranchOnPromotion:
					'createBranchOnPromotion' in found && found.createBranchOnPromotion,
				allowIncomplete: found.allowIncomplete,
			};
		}
		const found = instanceEnvironment.value;
		if (!found) return null;
		return {
			id: found.id,
			name: found.name,
			direction: found.direction,
			providerType: found.provider.type,
			branchName:
				found.direction === 'apply' ? found.settings.branchName : found.settings.baseBranchName,
			createBranchOnPromotion:
				found.direction === 'promote' && found.settings.createBranchOnPromotion,
			allowIncomplete: found.settings.allowIncomplete,
		};
	});
	/** Only the instance page knows the remote. The project lookup does not send it. */
	const repositoryName = computed(() =>
		projectId.value === undefined && instanceEnvironment.value
			? repositoryDisplayName(instanceEnvironment.value.remote)
			: null,
	);

	async function load() {
		const isLatest = next();
		const requested = { projectId: projectId.value, direction: direction.value };
		if (!preview.value) state.value = 'loading';
		refreshing.value = true;
		refreshFailed.value = false;

		try {
			let lookupFailed: boolean;
			if (requested.projectId === undefined) {
				await loadConnection();
				lookupFailed = connectionFailed.value;
			} else {
				await loadProjectEnvironments(requested.projectId);
				lookupFailed = projectLookupFailed.value;
				canOperate.value = projectEnvironments.value[requested.direction]?.canOperate !== false;
			}
			if (!isLatest()) return;
			if (lookupFailed || !environment.value) {
				state.value = lookupFailed ? 'connectionFailed' : 'disconnected';
				preview.value = null;
				return;
			}

			const result: PromotionPreview =
				requested.projectId === undefined
					? await getPromotionEnvironmentChanges(rootStore.publicApiContext, environment.value.id)
					: await getPromotionPreview(
							rootStore.publicApiContext,
							requested.projectId,
							requested.direction,
						);
			if (!isLatest()) return;
			preview.value = result;
			lastRefreshedAt.value = new Date();
			state.value = result.blocker ? 'blocked' : result.resources.length === 0 ? 'empty' : 'ready';
		} catch {
			if (!isLatest()) return;
			// Only the changes view shows the refresh warning. Other states show the error.
			if (state.value === 'ready') {
				refreshFailed.value = true;
			} else {
				preview.value = null;
				state.value = 'error';
			}
		} finally {
			if (isLatest()) refreshing.value = false;
		}
	}

	watch(
		[projectId, direction],
		async () => {
			preview.value = null;
			lastRefreshedAt.value = null;
			await load();
		},
		{ immediate: true },
	);

	return {
		state,
		preview,
		check,
		graph,
		environment,
		canOperate,
		repositoryName,
		refreshing,
		refreshFailed,
		lastRefreshedAt,
		refresh: load,
	};
}
