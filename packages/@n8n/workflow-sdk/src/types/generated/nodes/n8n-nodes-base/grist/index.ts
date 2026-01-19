/**
 * Grist Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { GristV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type GristNode = GristV1Node;