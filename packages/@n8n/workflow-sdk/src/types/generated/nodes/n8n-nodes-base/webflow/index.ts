/**
 * Webflow Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { WebflowV2Node } from './v2';
import type { WebflowV1Node } from './v1';

export * from './v2';
export * from './v1';

// Combined union type for all versions
export type WebflowNode = WebflowV2Node | WebflowV1Node;