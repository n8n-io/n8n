/**
 * LingvaNex Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LingvaNexV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type LingvaNexNode = LingvaNexV1Node;