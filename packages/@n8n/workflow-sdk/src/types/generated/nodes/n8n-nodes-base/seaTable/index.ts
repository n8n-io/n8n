/**
 * SeaTable Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { SeaTableV2Node } from './v2';
import type { SeaTableV1Node } from './v1';

export * from './v2';
export * from './v1';

// Combined union type for all versions
export type SeaTableNode = SeaTableV2Node | SeaTableV1Node;