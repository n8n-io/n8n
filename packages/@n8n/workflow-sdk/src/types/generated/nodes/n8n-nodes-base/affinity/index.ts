/**
 * Affinity Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { AffinityV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type AffinityNode = AffinityV1Node;