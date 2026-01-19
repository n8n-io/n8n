/**
 * OpenAI Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcOpenAiV21Node } from './v21';
import type { LcOpenAiV2Node } from './v2';
import type { LcOpenAiV18Node } from './v18';
import type { LcOpenAiV17Node } from './v17';
import type { LcOpenAiV16Node } from './v16';
import type { LcOpenAiV15Node } from './v15';
import type { LcOpenAiV14Node } from './v14';
import type { LcOpenAiV13Node } from './v13';
import type { LcOpenAiV12Node } from './v12';
import type { LcOpenAiV11Node } from './v11';
import type { LcOpenAiV1Node } from './v1';

export * from './v21';
export * from './v2';
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
export type LcOpenAiNode = LcOpenAiV21Node | LcOpenAiV2Node | LcOpenAiV18Node | LcOpenAiV17Node | LcOpenAiV16Node | LcOpenAiV15Node | LcOpenAiV14Node | LcOpenAiV13Node | LcOpenAiV12Node | LcOpenAiV11Node | LcOpenAiV1Node;