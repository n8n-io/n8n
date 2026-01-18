/**
 * Webhook Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { WebhookV21Node } from './v21';
import type { WebhookV2Node } from './v2';
import type { WebhookV11Node } from './v11';
import type { WebhookV1Node } from './v1';

export * from './v21';
export * from './v2';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type WebhookNode = WebhookV21Node | WebhookV2Node | WebhookV11Node | WebhookV1Node;