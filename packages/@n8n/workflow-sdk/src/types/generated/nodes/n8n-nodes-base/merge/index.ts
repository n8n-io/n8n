/**
 * Merge Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { MergeV32Node } from './v32';
import type { MergeV31Node } from './v31';
import type { MergeV3Node } from './v3';
import type { MergeV21Node } from './v21';
import type { MergeV2Node } from './v2';
import type { MergeV1Node } from './v1';

export * from './v32';
export * from './v31';
export * from './v3';
export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type MergeNode = MergeV32Node | MergeV31Node | MergeV3Node | MergeV21Node | MergeV2Node | MergeV1Node;