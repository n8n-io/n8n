/**
 * Question and Answer Chain Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcChainRetrievalQaV17Node } from './v17';
import type { LcChainRetrievalQaV16Node } from './v16';
import type { LcChainRetrievalQaV15Node } from './v15';
import type { LcChainRetrievalQaV14Node } from './v14';
import type { LcChainRetrievalQaV13Node } from './v13';
import type { LcChainRetrievalQaV12Node } from './v12';
import type { LcChainRetrievalQaV11Node } from './v11';
import type { LcChainRetrievalQaV1Node } from './v1';

export * from './v17';
export * from './v16';
export * from './v15';
export * from './v14';
export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcChainRetrievalQaNode = LcChainRetrievalQaV17Node | LcChainRetrievalQaV16Node | LcChainRetrievalQaV15Node | LcChainRetrievalQaV14Node | LcChainRetrievalQaV13Node | LcChainRetrievalQaV12Node | LcChainRetrievalQaV11Node | LcChainRetrievalQaV1Node;