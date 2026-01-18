/**
 * If Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { IfV23Node } from './v23';
import type { IfV1Node } from './v1';

export * from './v23';
export * from './v1';

// Combined union type for all versions
export type IfNode = IfV23Node | IfV1Node;