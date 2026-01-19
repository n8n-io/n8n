/**
 * Chargebee Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { ChargebeeTriggerV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type ChargebeeTriggerNode = ChargebeeTriggerV1Node;