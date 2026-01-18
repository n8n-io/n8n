/**
 * Evaluation Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { EvaluationV48Node } from './v48';

export * from './v48';

// Combined union type for all versions
export type EvaluationNode = EvaluationV48Node;