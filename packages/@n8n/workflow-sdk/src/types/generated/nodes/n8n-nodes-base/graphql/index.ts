/**
 * GraphQL Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { GraphqlV11Node } from './v11';
import type { GraphqlV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type GraphqlNode = GraphqlV11Node | GraphqlV1Node;