/**
 * Discord Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { DiscordV2Node } from './v2';
import type { DiscordV1Node } from './v1';

export * from './v2';
export * from './v1';

// Combined union type for all versions
export type DiscordNode = DiscordV2Node | DiscordV1Node;