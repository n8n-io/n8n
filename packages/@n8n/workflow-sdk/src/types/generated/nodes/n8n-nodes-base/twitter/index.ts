/**
 * X (Formerly Twitter) Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { TwitterV2Node } from './v2';
import type { TwitterV1Node } from './v1';

export * from './v2';
export * from './v1';

// Combined union type for all versions
export type TwitterNode = TwitterV2Node | TwitterV1Node;