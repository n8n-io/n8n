/**
 * AI Agent Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcAgentV31Node } from './v31';
import type { LcAgentV3Node } from './v3';
import type { LcAgentV22Node } from './v22';
import type { LcAgentV21Node } from './v21';
import type { LcAgentV2Node } from './v2';
import type { LcAgentV19Node } from './v19';
import type { LcAgentV18Node } from './v18';
import type { LcAgentV17Node } from './v17';
import type { LcAgentV16Node } from './v16';
import type { LcAgentV15Node } from './v15';
import type { LcAgentV14Node } from './v14';
import type { LcAgentV13Node } from './v13';
import type { LcAgentV12Node } from './v12';
import type { LcAgentV11Node } from './v11';
import type { LcAgentV1Node } from './v1';

export * from './v31';
export * from './v3';
export * from './v22';
export * from './v21';
export * from './v2';
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
export type LcAgentNode = LcAgentV31Node | LcAgentV3Node | LcAgentV22Node | LcAgentV21Node | LcAgentV2Node | LcAgentV19Node | LcAgentV18Node | LcAgentV17Node | LcAgentV16Node | LcAgentV15Node | LcAgentV14Node | LcAgentV13Node | LcAgentV12Node | LcAgentV11Node | LcAgentV1Node;