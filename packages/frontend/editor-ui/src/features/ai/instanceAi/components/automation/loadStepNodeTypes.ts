import type { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

type NodeTypesStore = Pick<ReturnType<typeof useNodeTypesStore>, 'loadNodeTypesIfNotLoaded'>;

/** One request for all the cards that mount while the store has no node types. */
const pendingLoads = new WeakMap<NodeTypesStore, Promise<void>>();

/**
 * Loads the node types for the step icons. The Assistant chat can show a card before another
 * view loads them, and a node icon without its node type shows only a letter.
 * A failed load is ignored: the icons keep the letter, and the labels still name the steps.
 */
export async function loadStepNodeTypes(store: NodeTypesStore): Promise<void> {
	const pending = pendingLoads.get(store);
	if (pending) return await pending;
	const load = (async () => {
		try {
			await store.loadNodeTypesIfNotLoaded();
		} catch {
			// The card works without the icons.
		} finally {
			pendingLoads.delete(store);
		}
	})();
	pendingLoads.set(store, load);
	return await load;
}
