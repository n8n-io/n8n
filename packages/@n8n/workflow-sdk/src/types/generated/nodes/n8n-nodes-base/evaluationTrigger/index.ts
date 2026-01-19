/**
 * Evaluation Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { EvaluationTriggerV47Node } from './v47';
import type { EvaluationTriggerV46Node } from './v46';

export * from './v47';
export * from './v46';

// Combined union type for all versions
export type EvaluationTriggerNode = EvaluationTriggerV47Node | EvaluationTriggerV46Node;