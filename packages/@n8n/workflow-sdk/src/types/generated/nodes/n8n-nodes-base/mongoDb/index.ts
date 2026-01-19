/**
 * MongoDB Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { MongoDbV12Node } from './v12';
import type { MongoDbV11Node } from './v11';
import type { MongoDbV1Node } from './v1';

export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type MongoDbNode = MongoDbV12Node | MongoDbV11Node | MongoDbV1Node;