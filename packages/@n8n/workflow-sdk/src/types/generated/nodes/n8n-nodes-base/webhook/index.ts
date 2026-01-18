/**
 * Webhook Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { WebhookV21Node } from './v21';

export * from './v21';

// Combined union type for all versions
export type WebhookNode = WebhookV21Node;