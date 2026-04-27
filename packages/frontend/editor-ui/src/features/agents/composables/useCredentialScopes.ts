import { ref, watch, type Ref, type MaybeRef, unref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getOAuthGrantedScopes } from '@/features/credentials/credentials.api';

/**
 * Fetches the OAuth scopes granted to a credential.
 *
 * Module-level cache keyed by credential id with two roles:
 *   - In-flight dedupe: concurrent callers share one fetch.
 *   - Short TTL: a resolved entry is reused for {@link CACHE_TTL_MS} so that
 *     re-opening the modal in quick succession doesn't re-fetch, but a
 *     credential re-authorized via OAuth surfaces its new scopes within the
 *     TTL window — no full reload required.
 *
 * Failures are not cached.
 *
 * Distinct from any n8n RBAC scope concept — this is purely OAuth grants.
 */
const CACHE_TTL_MS = 30_000;

interface CacheEntry {
	promise: Promise<string[]>;
	/** Set when the promise resolves; absent while in-flight. */
	resolvedAt?: number;
}

const cache = new Map<string, CacheEntry>();

function getOrCreateEntry(
	id: string,
	fetchFn: () => Promise<string[]>,
	force: boolean,
): Promise<string[]> {
	const existing = cache.get(id);
	const isFresh =
		existing?.resolvedAt !== undefined && Date.now() - existing.resolvedAt < CACHE_TTL_MS;

	if (!force && existing && (isFresh || existing.resolvedAt === undefined)) {
		return existing.promise;
	}

	const promise = fetchFn();
	const entry: CacheEntry = { promise };
	cache.set(id, entry);

	void promise.then(
		() => {
			entry.resolvedAt = Date.now();
		},
		() => {
			// Failures don't get cached — drop the entry so the next call retries.
			if (cache.get(id) === entry) cache.delete(id);
		},
	);

	return promise;
}

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

		try {
			scopes.value = await getOrCreateEntry(
				id,
				async () => await getOAuthGrantedScopes(rootStore.restApiContext, id),
				force,
			);
		} catch (e) {
			error.value = e instanceof Error ? e : new Error(String(e));
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

/**
 * Drop a credential's cached entry (e.g. after a successful re-authorization
 * flow that explicitly knows the granted scopes have changed). Optional —
 * the TTL bounds staleness even without explicit invalidation.
 */
export function invalidateCredentialScopes(credentialId: string): void {
	cache.delete(credentialId);
}
