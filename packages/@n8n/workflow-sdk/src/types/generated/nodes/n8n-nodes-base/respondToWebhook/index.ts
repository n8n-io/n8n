/**
 * Respond to Webhook Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { RespondToWebhookV15Node } from './v15';

export * from './v15';

// Combined union type for all versions
export type RespondToWebhookNode = RespondToWebhookV15Node;