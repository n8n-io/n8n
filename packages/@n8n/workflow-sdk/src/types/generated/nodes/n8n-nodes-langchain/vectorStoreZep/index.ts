/**
 * Zep Vector Store Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcVectorStoreZepV13Node } from './v13';
import type { LcVectorStoreZepV12Node } from './v12';
import type { LcVectorStoreZepV11Node } from './v11';
import type { LcVectorStoreZepV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcVectorStoreZepNode = LcVectorStoreZepV13Node | LcVectorStoreZepV12Node | LcVectorStoreZepV11Node | LcVectorStoreZepV1Node;