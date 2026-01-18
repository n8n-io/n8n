/**
 * MySQL Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { MySqlV25Node } from './v25';
import type { MySqlV1Node } from './v1';

export * from './v25';
export * from './v1';

// Combined union type for all versions
export type MySqlNode = MySqlV25Node | MySqlV1Node;