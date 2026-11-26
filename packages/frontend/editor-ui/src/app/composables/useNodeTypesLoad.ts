import { computed, readonly, ref, shallowRef } from 'vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

/**
 * Starts or joins the shared node types load, and reports its state.
 *
 * Startup does not wait for the node types. Use this composable in each place that needs them.
 * The store shares one request between callers, so this never sends a second request.
 * It uses no lifecycle hooks, so it also works inside other composables.
 */
export function useNodeTypesLoad() {
	const nodeTypesStore = useNodeTypesStore();

	const isSettled = ref(false);
	const error = shallowRef<unknown>();

	const load = (async () => {
		await nodeTypesStore.loadNodeTypesIfNotLoaded();
	})();
	// Handles the rejection, so a caller that only reads the state causes no unhandled rejection.
	const settled = load.then(
		() => {
			isSettled.value = true;
		},
		(loadError: unknown) => {
			error.value = loadError;
			isSettled.value = true;
		},
	);

	/** The store holds the node types. */
	const isLoaded = computed(() => nodeTypesStore.hasNodeTypes);
	/** The node types are not in the store, and the load has not ended. */
	const isLoading = computed(() => !isLoaded.value && !isSettled.value);

	return {
		isLoaded,
		isLoading,
		/** The error of the load that this instance joined, or `undefined`. */
		error: readonly(error),
		/** Resolves when the load succeeds. Rejects with the load error. */
		whenLoaded: async () => await load,
		/** Resolves when the load ends, also when it fails. Never rejects. */
		whenSettled: async () => await settled,
	};
}
