import { ref, watch, type Ref, type MaybeRef, unref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getOAuthGrantedScopes } from '@/features/credentials/credentials.api';

/**
 * Fetches the OAuth scopes granted to a credential. Module-level cache keyed
 * by credential id so concurrent callers share one fetch and re-renders don't
 * re-trigger network calls. Failures are not cached (next call retries).
 *
 * Distinct from any n8n RBAC scope concept — this is purely OAuth grants.
 */
const cache = new Map<string, Promise<string[]>>();

export function useCredentialScopes(credentialId: MaybeRef<string | undefined>): {
	scopes: Ref<string[] | undefined>;
	loading: Ref<boolean>;
	error: Ref<Error | null>;
	refetch: () => Promise<void>;
} {
	const scopes = ref<string[] | undefined>(undefined);
	const loading = ref(false);
	const error = ref<Error | null>(null);
	const rootStore = useRootStore();

	async function load(id: string, force = false): Promise<void> {
		loading.value = true;
		error.value = null;

		let promise = cache.get(id);
		if (force || !promise) {
			promise = getOAuthGrantedScopes(rootStore.restApiContext, id);
			cache.set(id, promise);
		}

		try {
			scopes.value = await promise;
		} catch (e) {
			error.value = e instanceof Error ? e : new Error(String(e));
			cache.delete(id); // don't cache failures
		} finally {
			loading.value = false;
		}
	}

	watch(
		() => unref(credentialId),
		(id) => {
			if (!id) {
				scopes.value = undefined;
				error.value = null;
				return;
			}
			void load(id);
		},
		{ immediate: true },
	);

	return {
		scopes,
		loading,
		error,
		refetch: async () => {
			const id = unref(credentialId);
			if (id) await load(id, true);
		},
	};
}
