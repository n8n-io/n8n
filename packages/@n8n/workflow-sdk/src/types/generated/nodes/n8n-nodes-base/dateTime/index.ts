/**
 * Date & Time Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { DateTimeV2Node } from './v2';
import type { DateTimeV1Node } from './v1';

export * from './v2';
export * from './v1';

// Combined union type for all versions
export type DateTimeNode = DateTimeV2Node | DateTimeV1Node;