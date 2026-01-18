/**
 * TheHive Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { TheHiveTriggerV2Node } from './v2';
import type { TheHiveTriggerV1Node } from './v1';

export * from './v2';
export * from './v1';

// Combined union type for all versions
export type TheHiveTriggerNode = TheHiveTriggerV2Node | TheHiveTriggerV1Node;