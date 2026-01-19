/**
 * Marketstack Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { MarketstackV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type MarketstackNode = MarketstackV1Node;