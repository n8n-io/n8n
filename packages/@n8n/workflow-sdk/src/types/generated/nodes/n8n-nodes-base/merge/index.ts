/**
 * Merge Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { MergeV32Node } from './v32';
import type { MergeV21Node } from './v21';
import type { MergeV1Node } from './v1';

export * from './v32';
export * from './v21';
export * from './v1';

// Combined union type for all versions
export type MergeNode = MergeV32Node | MergeV21Node | MergeV1Node;