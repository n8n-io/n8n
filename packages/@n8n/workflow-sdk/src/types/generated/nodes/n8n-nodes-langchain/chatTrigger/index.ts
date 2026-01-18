/**
 * Chat Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcChatTriggerV14Node } from './v14';

export * from './v14';

// Combined union type for all versions
export type LcChatTriggerNode = LcChatTriggerV14Node;