/**
 * Schedule Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { ScheduleTriggerV13Node } from './v13';
import type { ScheduleTriggerV12Node } from './v12';
import type { ScheduleTriggerV11Node } from './v11';
import type { ScheduleTriggerV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type ScheduleTriggerNode = ScheduleTriggerV13Node | ScheduleTriggerV12Node | ScheduleTriggerV11Node | ScheduleTriggerV1Node;