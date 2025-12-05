/**
 * Cache control utilities for optimizing Anthropic prompt caching.
 *
 * This module implements a 4-breakpoint caching strategy that achieves 80-85% cache hit rates
 * by strategically placing cache markers and managing workflow context.
 *
 * @see README.md for detailed visualization and explanation
 */

export {
	findUserToolMessageIndices,
	cleanStaleWorkflowContext,
	applyCacheControlMarkers,
	applySubgraphCacheMarkers,
} from './helpers';
