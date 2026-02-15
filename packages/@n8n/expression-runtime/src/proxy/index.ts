import { createProxyCallbacks } from './callbacks';
import { createDeepLazyProxy } from './deep-lazy-proxy';
import type { ProxyOptions } from './types';

/**
 * Creates a deep lazy proxy for workflow data
 * @param dataSource - The workflow data object
 * @param options - Configuration options
 * @returns Proxy with lazy loading for workflow data properties
 */
export function createWorkflowDataProxy(
	dataSource: Record<string, any>,
	options: ProxyOptions = {},
) {
	const callbacks = createProxyCallbacks(dataSource, options);

	// Create proxies for main properties
	return {
		$json: createDeepLazyProxy(['$json'], callbacks),
		$binary: createDeepLazyProxy(['$binary'], callbacks),
		$input: createDeepLazyProxy(['$input'], callbacks),
		$node: createDeepLazyProxy(['$node'], callbacks),
		$parameter: createDeepLazyProxy(['$parameter'], callbacks),
		$workflow: createDeepLazyProxy(['$workflow'], callbacks),
		$prevNode: createDeepLazyProxy(['$prevNode'], callbacks),

		// Primitives (fetched upfront)
		$runIndex: dataSource.$runIndex,
		$itemIndex: dataSource.$itemIndex,

		// Functions
		$items: dataSource.$items,
		$jmesPath: dataSource.$jmesPath,
		$getPairedItem: dataSource.$getPairedItem,
	};
}

// Re-export types
export type { ProxyCallbacks, ProxyOptions, ValueMetadata } from './types';
export { createProxyCallbacks } from './callbacks';
export { createDeepLazyProxy } from './deep-lazy-proxy';
