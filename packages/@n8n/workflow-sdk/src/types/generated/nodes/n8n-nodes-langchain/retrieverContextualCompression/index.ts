/**
 * Contextual Compression Retriever Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcRetrieverContextualCompressionV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type LcRetrieverContextualCompressionNode = LcRetrieverContextualCompressionV1Node;