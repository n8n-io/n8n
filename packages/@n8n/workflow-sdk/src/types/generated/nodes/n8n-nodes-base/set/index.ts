/**
 * Edit Fields (Set) Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { SetV34Node } from './v34';
import type { SetV33Node } from './v33';
import type { SetV32Node } from './v32';
import type { SetV31Node } from './v31';
import type { SetV3Node } from './v3';
import type { SetV2Node } from './v2';
import type { SetV1Node } from './v1';

export * from './v34';
export * from './v33';
export * from './v32';
export * from './v31';
export * from './v3';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type SetNode = SetV34Node | SetV33Node | SetV32Node | SetV31Node | SetV3Node | SetV2Node | SetV1Node;