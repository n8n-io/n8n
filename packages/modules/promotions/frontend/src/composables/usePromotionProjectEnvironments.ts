import type { PromotionDirection, PromotionProjectEnvironments } from '@n8n/api-types';
import type { PublicApiContext } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';

import { getPromotionProjectEnvironments } from '../promotions.api';

type ProjectLookup = { environments: PromotionProjectEnvironments; failed: boolean };

const lookups = new Map<string, Promise<ProjectLookup>>();

/** Call it after an environment or a project link changes. */
export function invalidatePromotionProjectEnvironments(projectId?: string) {
	if (projectId === undefined) lookups.clear();
	else lookups.delete(projectId);
}

/**
 * One lookup for each project, shared by the header badges, the route guard and the preview
 * page. A failed lookup is not kept, so the next caller tries again.
 */
export async function loadPromotionProjectEnvironments(
	context: PublicApiContext,
	projectId: string,
): Promise<ProjectLookup> {
	let lookup = lookups.get(projectId);
	if (!lookup) {
		lookup = getPromotionProjectEnvironments(context, projectId)
			.then((environments) => ({ environments, failed: false }))
			.catch(() => {
				invalidatePromotionProjectEnvironments(projectId);
				return { environments: {}, failed: true };
			});
		lookups.set(projectId, lookup);
	}
	return await lookup;
}

/**
 * The promote and apply environments of one project, and whether the user can run each
 * operation there. It needs no global promotion scope, so it also serves a project admin.
 */
export function usePromotionProjectEnvironments() {
	const rootStore = useRootStore();
	const environments = ref<PromotionProjectEnvironments>({});
	/** True when the last lookup failed, so a caller can tell it apart from "no environment". */
	const failed = ref(false);
	let latest: string | undefined;

	async function load(projectId: string | undefined) {
		latest = projectId;
		if (projectId === undefined) {
			environments.value = {};
			failed.value = false;
			return;
		}
		const lookup = await loadPromotionProjectEnvironments(rootStore.publicApiContext, projectId);
		// The user can leave the project while the lookup runs.
		if (latest !== projectId) return;
		environments.value = lookup.environments;
		failed.value = lookup.failed;
	}

	const canOperate = (direction: PromotionDirection) =>
		environments.value[direction]?.canOperate === true;
	const canPromote = computed(() => canOperate('promote'));
	const canApply = computed(() => canOperate('apply'));

	return { environments, failed, canPromote, canApply, load };
}
