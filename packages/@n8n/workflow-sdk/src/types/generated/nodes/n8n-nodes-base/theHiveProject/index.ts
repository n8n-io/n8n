/**
 * TheHive 5 Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { TheHiveProjectV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type TheHiveProjectNode = TheHiveProjectV1Node;