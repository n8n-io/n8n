/**
 * Convert to File Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { ConvertToFileV11Node } from './v11';
import type { ConvertToFileV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type ConvertToFileNode = ConvertToFileV11Node | ConvertToFileV1Node;