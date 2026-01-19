/**
 * Chat Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcChatV11Node } from './v11';
import type { LcChatV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcChatNode = LcChatV11Node | LcChatV1Node;