import type { InstanceTypeAccess } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { shallowRef } from 'vue';

import { fetchInstanceAccess } from '../type-availability-policies.api';

type TypeCount = { restricted: number; optIn: number; total: number };

type InstancePolicyCounts = { node: TypeCount; credential: TypeCount };

function countAccess(types: readonly InstanceTypeAccess[]): TypeCount {
	return {
		restricted: types.filter((type) => type.access === 'deny').length,
		optIn: types.filter((type) => type.access === 'delegate').length,
		total: types.length,
	};
}

/**
 * How many types the instance policy restricts and opens to project opt-in. A project without a
 * policy cannot use the opt-in types either, so the card names them next to the restricted ones.
 */
export function useInstancePolicyCounts() {
	const rootStore = useRootStore();
	const counts = shallowRef<InstancePolicyCounts | null>(null);

	async function load(): Promise<void> {
		try {
			const [nodeAccess, credentialAccess] = await Promise.all([
				fetchInstanceAccess(rootStore.restApiContext, 'node'),
				fetchInstanceAccess(rootStore.restApiContext, 'credential'),
			]);
			counts.value = {
				node: countAccess(nodeAccess.types),
				credential: countAccess(credentialAccess.types),
			};
		} catch {
			// `counts` stays `null`, so the page shows no counts instead of wrong ones.
		}
	}

	return { counts, load };
}
