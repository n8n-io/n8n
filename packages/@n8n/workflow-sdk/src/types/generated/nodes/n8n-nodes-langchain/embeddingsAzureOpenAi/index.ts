/**
 * Embeddings Azure OpenAI Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcEmbeddingsAzureOpenAiV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type LcEmbeddingsAzureOpenAiNode = LcEmbeddingsAzureOpenAiV1Node;