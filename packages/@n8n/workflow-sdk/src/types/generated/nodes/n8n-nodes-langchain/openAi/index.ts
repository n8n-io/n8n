/**
 * OpenAI Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcOpenAiV21Node } from './v21';
import type { LcOpenAiV18Node } from './v18';

export * from './v21';
export * from './v18';

// Combined union type for all versions
export type LcOpenAiNode = LcOpenAiV21Node | LcOpenAiV18Node;