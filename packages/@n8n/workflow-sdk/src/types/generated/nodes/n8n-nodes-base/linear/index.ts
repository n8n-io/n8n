/**
 * Linear Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LinearV11Node } from './v11';
import type { LinearV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LinearNode = LinearV11Node | LinearV1Node;