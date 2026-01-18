/**
 * RSS Read Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { RssFeedReadV12Node } from './v12';

export * from './v12';

// Combined union type for all versions
export type RssFeedReadNode = RssFeedReadV12Node;