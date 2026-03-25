export interface UseNodesInitializedOptions {
  includeHiddenNodes?: boolean
}
/**
 * Composable for getting the initialized state of all nodes.
 *
 * When a new node is added to the graph, it is not immediately initialized.
 * That's because the node's bounds are not yet known.
 * This composable will return false and then true when all nodes are initialized, i.e. when their bounds are known.
 *
 * @public
 * @param options - Options
 * @returns boolean indicating whether all nodes are initialized
 */
export declare function useNodesInitialized(options?: UseNodesInitializedOptions): import('vue').ComputedRef<boolean>
