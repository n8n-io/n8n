import type { ProjectPolicySummary } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { shallowRef } from 'vue';

import { fetchProjectPolicies } from '../type-availability-policies.api';

/** The team projects with their policy state. `projects` stays `null` until a read succeeds. */
export function useProjectPolicies() {
	const rootStore = useRootStore();
	const projects = shallowRef<ProjectPolicySummary[] | null>(null);

	async function load(): Promise<void> {
		try {
			projects.value = (await fetchProjectPolicies(rootStore.restApiContext)).projects;
		} catch {
			// A failed read keeps the last list, so the page shows nothing it cannot back up.
		}
	}

	return { projects, load };
}
