/**
 * E2E Test Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { E2eTestV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type E2eTestNode = E2eTestV1Node;