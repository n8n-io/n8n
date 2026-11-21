import type { PromotionDirection, PromotionPreview } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, shallowRef, watch, type Ref } from 'vue';

import { useLatestFetch } from '@n8n/composables/useLatestFetch';

import { getPromotionEnvironmentChanges, getPromotionPreview } from '../promotions.api';
import { fetchPromotionEnvironments } from '../promotionsSettings.api';
import { isPreviewNotConfigured } from '../promotionErrors';
import type { ApplyCheckResult } from '../promotions.types';
import { buildSelectionGraph } from '../promotionPreview.selection';

type PromotionPreviewState =
	| 'loading'
	/** The project has no environment for this direction. */
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
	/** The environment and branch that the preview reads. */
	const source = computed(() => preview.value?.source ?? null);
	/** How that environment presents itself: its name, provider and branch setting. */
	const environment = computed(() => preview.value?.environment ?? null);

	async function load() {
		const isLatest = next();
		const requested = { projectId: projectId.value, direction: direction.value };
		if (!preview.value) state.value = 'loading';
		refreshing.value = true;
		refreshFailed.value = false;

		try {
			let result: PromotionPreview;
			if (requested.projectId === undefined) {
				const environments = await fetchPromotionEnvironments(rootStore.publicApiContext, {
					scope: 'instance',
				});
				if (!isLatest()) return;
				const environment = environments.find(({ direction }) => direction === requested.direction);
				if (!environment) {
					preview.value = null;
					state.value = 'disconnected';
					return;
				}
				result = await getPromotionEnvironmentChanges(rootStore.publicApiContext, environment.id);
			} else {
				result = await getPromotionPreview(
					rootStore.publicApiContext,
					requested.projectId,
					requested.direction,
				);
			}
			if (!isLatest()) return;
			preview.value = result;
			lastRefreshedAt.value = new Date();
			state.value = result.blocker ? 'blocked' : result.resources.length === 0 ? 'empty' : 'ready';
		} catch (error) {
			if (!isLatest()) return;
			if (isPreviewNotConfigured(error)) {
				preview.value = null;
				state.value = 'disconnected';
			} else if (state.value === 'ready') {
				// Only the changes view shows the refresh warning. Other states show the error.
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
		source,
		environment,
		refreshing,
		refreshFailed,
		lastRefreshedAt,
		refresh: load,
	};
}
