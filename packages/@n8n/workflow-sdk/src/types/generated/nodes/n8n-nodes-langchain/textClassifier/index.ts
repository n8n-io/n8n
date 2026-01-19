/**
 * Text Classifier Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcTextClassifierV11Node } from './v11';
import type { LcTextClassifierV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcTextClassifierNode = LcTextClassifierV11Node | LcTextClassifierV1Node;