import type { ApplyCheckResult, PromotionDirection, PromotionPreview } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, shallowRef, watch, type Ref } from 'vue';

import { useLatestFetch } from '@/app/composables/useLatestFetch';

import { getApplyBlockers, getPromotionPreview } from '../promotions.api';
import { buildSelectionGraph } from '../promotionPreview.selection';
import { repositoryDisplayName } from '../promotionsSettings.utils';
import { useInstancePromotionConnection } from './useInstancePromotionConnection';

type PromotionPreviewState =
	| 'loading'
	/** The connection lookup failed. This is not the same as "no connection". */
	| 'connectionFailed'
	/** The instance has no environment for this direction. */
	| 'disconnected'
	| 'error'
	| 'empty'
	| 'ready';

/**
 * Loads the preview of one project and direction for the preview page. On Apply, it also loads
 * the blockers at the commit of the preview, so both describe the same source.
 */
export function usePromotionPreview(projectId: Ref<string>, direction: Ref<PromotionDirection>) {
	const rootStore = useRootStore();
	const { next } = useLatestFetch();
	const {
		environments,
		failed: connectionFailed,
		load: loadConnection,
	} = useInstancePromotionConnection();

	const state = ref<PromotionPreviewState>('loading');
	const preview = shallowRef<PromotionPreview | null>(null);
	/** The Apply check. `null` on Promote, and when the branch has no commit yet. */
	const check = shallowRef<ApplyCheckResult | null>(null);
	const refreshing = ref(false);
	/** True when a refresh failed. The page keeps the last preview and says so. */
	const refreshFailed = ref(false);
	const lastRefreshedAt = ref<Date | null>(null);
	const graph = computed(() =>
		preview.value ? buildSelectionGraph(preview.value, direction.value) : null,
	);
	const environment = computed(
		() => environments.value.find((candidate) => candidate.direction === direction.value) ?? null,
	);
	const repositoryName = computed(() =>
		environment.value ? repositoryDisplayName(environment.value.remote) : null,
	);

	async function load() {
		const isLatest = next();
		const requested = { projectId: projectId.value, direction: direction.value };
		if (!preview.value) state.value = 'loading';
		refreshing.value = true;
		refreshFailed.value = false;

		try {
			await loadConnection();
			if (!isLatest()) return;
			if (connectionFailed.value || !environment.value) {
				state.value = connectionFailed.value ? 'connectionFailed' : 'disconnected';
				preview.value = null;
				check.value = null;
				return;
			}

			const result = await getPromotionPreview(
				rootStore.restApiContext,
				requested.projectId,
				requested.direction,
			);
			const blockers =
				requested.direction === 'apply' && result.commitSha && result.resources.length > 0
					? await getApplyBlockers(rootStore.restApiContext, requested.projectId, result.commitSha)
					: null;
			if (!isLatest()) return;
			preview.value = result;
			check.value = blockers;
			lastRefreshedAt.value = new Date();
			state.value = result.resources.length === 0 ? 'empty' : 'ready';
		} catch {
			if (!isLatest()) return;
			// Only the changes view shows the refresh warning. Other states show the error.
			if (state.value === 'ready') {
				refreshFailed.value = true;
			} else {
				preview.value = null;
				check.value = null;
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
			check.value = null;
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
		repositoryName,
		refreshing,
		refreshFailed,
		lastRefreshedAt,
		refresh: load,
	};
}
