/**
 * Filter Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { FilterV23Node } from './v23';
import type { FilterV22Node } from './v22';
import type { FilterV21Node } from './v21';
import type { FilterV2Node } from './v2';
import type { FilterV1Node } from './v1';

export * from './v23';
export * from './v22';
export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type FilterNode = FilterV23Node | FilterV22Node | FilterV21Node | FilterV2Node | FilterV1Node;