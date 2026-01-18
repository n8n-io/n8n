/**
 * Respond to Webhook Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { RespondToWebhookV15Node } from './v15';
import type { RespondToWebhookV14Node } from './v14';
import type { RespondToWebhookV13Node } from './v13';
import type { RespondToWebhookV12Node } from './v12';
import type { RespondToWebhookV11Node } from './v11';
import type { RespondToWebhookV1Node } from './v1';

export * from './v15';
export * from './v14';
export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type RespondToWebhookNode = RespondToWebhookV15Node | RespondToWebhookV14Node | RespondToWebhookV13Node | RespondToWebhookV12Node | RespondToWebhookV11Node | RespondToWebhookV1Node;