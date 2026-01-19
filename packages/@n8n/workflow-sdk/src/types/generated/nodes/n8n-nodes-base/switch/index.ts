/**
 * Switch Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { SwitchV34Node } from './v34';
import type { SwitchV33Node } from './v33';
import type { SwitchV32Node } from './v32';
import type { SwitchV31Node } from './v31';
import type { SwitchV3Node } from './v3';
import type { SwitchV2Node } from './v2';
import type { SwitchV1Node } from './v1';

export * from './v34';
export * from './v33';
export * from './v32';
export * from './v31';
export * from './v3';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type SwitchNode = SwitchV34Node | SwitchV33Node | SwitchV32Node | SwitchV31Node | SwitchV3Node | SwitchV2Node | SwitchV1Node;