/**
 * Weaviate Vector Store Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcVectorStoreWeaviateV13Node } from './v13';
import type { LcVectorStoreWeaviateV12Node } from './v12';
import type { LcVectorStoreWeaviateV11Node } from './v11';
import type { LcVectorStoreWeaviateV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcVectorStoreWeaviateNode = LcVectorStoreWeaviateV13Node | LcVectorStoreWeaviateV12Node | LcVectorStoreWeaviateV11Node | LcVectorStoreWeaviateV1Node;