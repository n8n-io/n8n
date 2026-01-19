/**
 * Telegram Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { TelegramV12Node } from './v12';
import type { TelegramV11Node } from './v11';
import type { TelegramV1Node } from './v1';

export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type TelegramNode = TelegramV12Node | TelegramV11Node | TelegramV1Node;