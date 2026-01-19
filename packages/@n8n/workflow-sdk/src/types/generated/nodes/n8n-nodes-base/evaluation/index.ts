/**
 * Evaluation Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { EvaluationV48Node } from './v48';
import type { EvaluationV47Node } from './v47';
import type { EvaluationV46Node } from './v46';

export * from './v48';
export * from './v47';
export * from './v46';

// Combined union type for all versions
export type EvaluationNode = EvaluationV48Node | EvaluationV47Node | EvaluationV46Node;