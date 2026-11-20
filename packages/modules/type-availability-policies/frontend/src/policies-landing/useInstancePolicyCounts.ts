import type { InstanceTypeAccess } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { shallowRef } from 'vue';

import { visibleNodeTypes } from '../instance-policy/visibleNodeTypes';
import {
	fetchInstanceAccess,
	fetchInstancePolicy,
	fetchNodeTypeSummaries,
} from '../type-availability-policies.api';

type TypeCount = { restricted: number; total: number };

type InstancePolicyCounts = { node: TypeCount; credential: TypeCount };

function countRestricted(types: readonly InstanceTypeAccess[]): TypeCount {
	return {
		restricted: types.filter((type) => type.access === 'deny').length,
		total: types.length,
	};
}

/** How many types the instance policy restricts, counted as the instance policy page lists them. */
export function useInstancePolicyCounts() {
	const rootStore = useRootStore();
	const counts = shallowRef<InstancePolicyCounts | null>(null);

	async function load(): Promise<void> {
		try {
			const [nodeAccess, nodePolicy, credentialAccess, summaries] = await Promise.all([
				fetchInstanceAccess(rootStore.restApiContext, 'node'),
				fetchInstancePolicy(rootStore.restApiContext, 'node'),
				fetchInstanceAccess(rootStore.restApiContext, 'credential'),
				fetchNodeTypeSummaries(rootStore.baseUrl),
			]);
			counts.value = {
				node: countRestricted(visibleNodeTypes(nodeAccess.types, summaries, nodePolicy.rules)),
				credential: countRestricted(credentialAccess.types),
			};
		} catch {
			// `counts` stays `null`, so the page shows no counts instead of wrong ones.
		}
	}

	return { counts, load };
}
