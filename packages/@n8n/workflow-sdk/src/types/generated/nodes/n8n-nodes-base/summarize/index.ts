/**
 * Summarize Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { SummarizeV11Node } from './v11';
import type { SummarizeV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type SummarizeNode = SummarizeV11Node | SummarizeV1Node;