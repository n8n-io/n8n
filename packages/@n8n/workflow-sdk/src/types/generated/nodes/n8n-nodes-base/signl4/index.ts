/**
 * SIGNL4 Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { Signl4V1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type Signl4Node = Signl4V1Node;