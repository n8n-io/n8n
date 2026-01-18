/**
 * Basic LLM Chain Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcChainLlmV19Node } from './v19';
import type { LcChainLlmV18Node } from './v18';
import type { LcChainLlmV17Node } from './v17';
import type { LcChainLlmV16Node } from './v16';
import type { LcChainLlmV15Node } from './v15';
import type { LcChainLlmV14Node } from './v14';
import type { LcChainLlmV13Node } from './v13';
import type { LcChainLlmV12Node } from './v12';
import type { LcChainLlmV11Node } from './v11';
import type { LcChainLlmV1Node } from './v1';

export * from './v19';
export * from './v18';
export * from './v17';
export * from './v16';
export * from './v15';
export * from './v14';
export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcChainLlmNode = LcChainLlmV19Node | LcChainLlmV18Node | LcChainLlmV17Node | LcChainLlmV16Node | LcChainLlmV15Node | LcChainLlmV14Node | LcChainLlmV13Node | LcChainLlmV12Node | LcChainLlmV11Node | LcChainLlmV1Node;