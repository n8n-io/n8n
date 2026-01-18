/**
 * Reddit Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { RedditV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type RedditNode = RedditV1Node;