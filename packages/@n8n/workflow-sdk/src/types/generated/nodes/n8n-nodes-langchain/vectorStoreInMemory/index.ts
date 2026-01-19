/**
 * Simple Vector Store Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcVectorStoreInMemoryV13Node } from './v13';
import type { LcVectorStoreInMemoryV12Node } from './v12';
import type { LcVectorStoreInMemoryV11Node } from './v11';
import type { LcVectorStoreInMemoryV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcVectorStoreInMemoryNode = LcVectorStoreInMemoryV13Node | LcVectorStoreInMemoryV12Node | LcVectorStoreInMemoryV11Node | LcVectorStoreInMemoryV1Node;