/**
 * Azure AI Search Vector Store Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcVectorStoreAzureAISearchV13Node } from './v13';
import type { LcVectorStoreAzureAISearchV12Node } from './v12';
import type { LcVectorStoreAzureAISearchV11Node } from './v11';
import type { LcVectorStoreAzureAISearchV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcVectorStoreAzureAISearchNode = LcVectorStoreAzureAISearchV13Node | LcVectorStoreAzureAISearchV12Node | LcVectorStoreAzureAISearchV11Node | LcVectorStoreAzureAISearchV1Node;