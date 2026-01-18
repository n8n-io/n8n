/**
 * Telegram Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { TelegramTriggerV12Node } from './v12';
import type { TelegramTriggerV11Node } from './v11';
import type { TelegramTriggerV1Node } from './v1';

export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type TelegramTriggerNode = TelegramTriggerV12Node | TelegramTriggerV11Node | TelegramTriggerV1Node;