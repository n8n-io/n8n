/**
 * HighLevel Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { HighLevelV2Node } from './v2';
import type { HighLevelV1Node } from './v1';

export * from './v2';
export * from './v1';

// Combined union type for all versions
export type HighLevelNode = HighLevelV2Node | HighLevelV1Node;