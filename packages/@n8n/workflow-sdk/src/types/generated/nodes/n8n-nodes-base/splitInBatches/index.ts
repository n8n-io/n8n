/**
 * Loop Over Items (Split in Batches) Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { SplitInBatchesV3Node } from './v3';
import type { SplitInBatchesV2Node } from './v2';
import type { SplitInBatchesV1Node } from './v1';

export * from './v3';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type SplitInBatchesNode = SplitInBatchesV3Node | SplitInBatchesV2Node | SplitInBatchesV1Node;