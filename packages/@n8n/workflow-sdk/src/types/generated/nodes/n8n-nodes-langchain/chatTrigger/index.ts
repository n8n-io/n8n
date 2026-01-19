/**
 * Chat Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcChatTriggerV14Node } from './v14';
import type { LcChatTriggerV13Node } from './v13';
import type { LcChatTriggerV12Node } from './v12';
import type { LcChatTriggerV11Node } from './v11';
import type { LcChatTriggerV1Node } from './v1';

export * from './v14';
export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcChatTriggerNode = LcChatTriggerV14Node | LcChatTriggerV13Node | LcChatTriggerV12Node | LcChatTriggerV11Node | LcChatTriggerV1Node;