/**
 * Microsoft SQL Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { MicrosoftSqlV11Node } from './v11';
import type { MicrosoftSqlV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type MicrosoftSqlNode = MicrosoftSqlV11Node | MicrosoftSqlV1Node;