/**
 * No Operation, do nothing Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { NoOpV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type NoOpNode = NoOpV1Node;