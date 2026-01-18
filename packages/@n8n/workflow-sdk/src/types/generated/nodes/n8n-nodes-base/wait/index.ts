/**
 * Wait Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { WaitV11Node } from './v11';
import type { WaitV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type WaitNode = WaitV11Node | WaitV1Node;