import type { TypeUsage } from '@n8n/api-types';
import { shallowRef } from 'vue';

const NO_USAGE: TypeUsage = { uses: 0, workflows: 0, activeWorkflows: 0, projects: 0 };

/**
 * The usage counts of one type kind for the instance policy table. A type with no entry has no
 * usage. `usageOf` returns `null` until the counts load, or when they do not load, so that the
 * usage cells show no value.
 */
export function useTypeUsage(fetchUsage: () => Promise<Record<string, TypeUsage>>) {
	const usage = shallowRef<Record<string, TypeUsage> | null>(null);

	async function load() {
		try {
			usage.value = await fetchUsage();
		} catch {
			// The usage cells show no value instead.
		}
	}

	function usageOf(typeName: string): TypeUsage | null {
		if (usage.value === null) return null;
		// An own key only: a type name can be an `Object.prototype` key, such as `constructor`.
		return Object.hasOwn(usage.value, typeName) ? usage.value[typeName] : NO_USAGE;
	}

	return { load, usageOf };
}
