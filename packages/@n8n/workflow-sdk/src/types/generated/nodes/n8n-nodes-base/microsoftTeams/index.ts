/**
 * Microsoft Teams Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { MicrosoftTeamsV2Node } from './v2';
import type { MicrosoftTeamsV11Node } from './v11';
import type { MicrosoftTeamsV1Node } from './v1';

export * from './v2';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type MicrosoftTeamsNode = MicrosoftTeamsV2Node | MicrosoftTeamsV11Node | MicrosoftTeamsV1Node;