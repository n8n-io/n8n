/**
 * MySQL Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { MySqlV25Node } from './v25';
import type { MySqlV24Node } from './v24';
import type { MySqlV23Node } from './v23';
import type { MySqlV22Node } from './v22';
import type { MySqlV21Node } from './v21';
import type { MySqlV2Node } from './v2';
import type { MySqlV1Node } from './v1';

export * from './v25';
export * from './v24';
export * from './v23';
export * from './v22';
export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type MySqlNode = MySqlV25Node | MySqlV24Node | MySqlV23Node | MySqlV22Node | MySqlV21Node | MySqlV2Node | MySqlV1Node;