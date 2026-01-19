/**
 * Airtop Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { AirtopV11Node } from './v11';
import type { AirtopV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type AirtopNode = AirtopV11Node | AirtopV1Node;