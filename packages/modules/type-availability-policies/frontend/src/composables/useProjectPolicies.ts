import type { ProjectPolicySummary } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { shallowRef } from 'vue';

import { fetchProjectPolicies } from '../type-availability-policies.api';

/** `projects` stays `null` until a read succeeds. */
export function useProjectPolicies() {
	const rootStore = useRootStore();
	const projects = shallowRef<ProjectPolicySummary[] | null>(null);
	let latestLoad = 0;

	async function load(): Promise<void> {
		const thisLoad = ++latestLoad;
		try {
			const { projects: list } = await fetchProjectPolicies(rootStore.restApiContext);
			// A read that ends after a newer one must not replace the newer list.
			if (thisLoad === latestLoad) projects.value = list;
		} catch {
			// A failed read keeps the last list, so the page shows nothing it cannot back up.
		}
	}

	return { projects, load };
}
