/**
 * HubSpot Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { HubspotV22Node } from './v22';
import type { HubspotV21Node } from './v21';
import type { HubspotV2Node } from './v2';
import type { HubspotV1Node } from './v1';

export * from './v22';
export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type HubspotNode = HubspotV22Node | HubspotV21Node | HubspotV2Node | HubspotV1Node;