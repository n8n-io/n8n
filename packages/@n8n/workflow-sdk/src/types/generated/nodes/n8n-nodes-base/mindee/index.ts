/**
 * Mindee Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { MindeeV3Node } from './v3';
import type { MindeeV2Node } from './v2';
import type { MindeeV1Node } from './v1';

export * from './v3';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type MindeeNode = MindeeV3Node | MindeeV2Node | MindeeV1Node;