/**
 * If Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { IfV23Node } from './v23';
import type { IfV22Node } from './v22';
import type { IfV21Node } from './v21';
import type { IfV2Node } from './v2';
import type { IfV1Node } from './v1';

export * from './v23';
export * from './v22';
export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type IfNode = IfV23Node | IfV22Node | IfV21Node | IfV2Node | IfV1Node;