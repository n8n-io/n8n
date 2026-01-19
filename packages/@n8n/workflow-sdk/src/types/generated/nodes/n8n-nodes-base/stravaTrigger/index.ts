/**
 * Strava Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { StravaTriggerV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type StravaTriggerNode = StravaTriggerV1Node;