/**
 * LangChain Code Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcCodeV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type LcCodeNode = LcCodeV1Node;