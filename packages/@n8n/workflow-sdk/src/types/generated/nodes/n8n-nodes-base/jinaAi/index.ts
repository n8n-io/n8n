/**
 * Jina AI Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { JinaAiV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type JinaAiNode = JinaAiV1Node;