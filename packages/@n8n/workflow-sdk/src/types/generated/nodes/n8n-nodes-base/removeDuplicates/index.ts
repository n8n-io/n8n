/**
 * Remove Duplicates Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { RemoveDuplicatesV2Node } from './v2';
import type { RemoveDuplicatesV11Node } from './v11';
import type { RemoveDuplicatesV1Node } from './v1';

export * from './v2';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type RemoveDuplicatesNode = RemoveDuplicatesV2Node | RemoveDuplicatesV11Node | RemoveDuplicatesV1Node;