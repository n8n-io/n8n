/**
 * Edit Fields (Set) Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { SetV34Node } from './v34';
import type { SetV2Node } from './v2';

export * from './v34';
export * from './v2';

// Combined union type for all versions
export type SetNode = SetV34Node | SetV2Node;