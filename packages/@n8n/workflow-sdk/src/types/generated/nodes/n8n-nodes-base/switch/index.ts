/**
 * Switch Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { SwitchV34Node } from './v34';
import type { SwitchV2Node } from './v2';
import type { SwitchV1Node } from './v1';

export * from './v34';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type SwitchNode = SwitchV34Node | SwitchV2Node | SwitchV1Node;