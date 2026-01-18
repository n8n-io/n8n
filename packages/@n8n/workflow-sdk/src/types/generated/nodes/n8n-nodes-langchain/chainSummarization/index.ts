/**
 * Summarization Chain Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcChainSummarizationV21Node } from './v21';
import type { LcChainSummarizationV1Node } from './v1';

export * from './v21';
export * from './v1';

// Combined union type for all versions
export type LcChainSummarizationNode = LcChainSummarizationV21Node | LcChainSummarizationV1Node;