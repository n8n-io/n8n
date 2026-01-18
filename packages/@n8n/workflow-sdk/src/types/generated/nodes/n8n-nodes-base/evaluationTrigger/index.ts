/**
 * Evaluation Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { EvaluationTriggerV47Node } from './v47';

export * from './v47';

// Combined union type for all versions
export type EvaluationTriggerNode = EvaluationTriggerV47Node;