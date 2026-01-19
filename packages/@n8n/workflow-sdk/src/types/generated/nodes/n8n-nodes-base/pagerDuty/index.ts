/**
 * PagerDuty Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { PagerDutyV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type PagerDutyNode = PagerDutyV1Node;