/**
 * Embeddings OpenAI Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcEmbeddingsOpenAiV12Node } from './v12';
import type { LcEmbeddingsOpenAiV11Node } from './v11';
import type { LcEmbeddingsOpenAiV1Node } from './v1';

export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcEmbeddingsOpenAiNode = LcEmbeddingsOpenAiV12Node | LcEmbeddingsOpenAiV11Node | LcEmbeddingsOpenAiV1Node;