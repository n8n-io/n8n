/**
 * NocoDB Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { NocoDbV3Node } from './v3';
import type { NocoDbV2Node } from './v2';
import type { NocoDbV1Node } from './v1';

export * from './v3';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type NocoDbNode = NocoDbV3Node | NocoDbV2Node | NocoDbV1Node;