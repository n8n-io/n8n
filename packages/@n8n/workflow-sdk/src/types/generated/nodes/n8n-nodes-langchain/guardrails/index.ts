/**
 * Guardrails Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcGuardrailsV2Node } from './v2';
import type { LcGuardrailsV1Node } from './v1';

export * from './v2';
export * from './v1';

// Combined union type for all versions
export type LcGuardrailsNode = LcGuardrailsV2Node | LcGuardrailsV1Node;