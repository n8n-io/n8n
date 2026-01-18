/**
 * MongoDB Atlas Vector Store Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcVectorStoreMongoDBAtlasV13Node } from './v13';
import type { LcVectorStoreMongoDBAtlasV12Node } from './v12';
import type { LcVectorStoreMongoDBAtlasV11Node } from './v11';
import type { LcVectorStoreMongoDBAtlasV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcVectorStoreMongoDBAtlasNode = LcVectorStoreMongoDBAtlasV13Node | LcVectorStoreMongoDBAtlasV12Node | LcVectorStoreMongoDBAtlasV11Node | LcVectorStoreMongoDBAtlasV1Node;