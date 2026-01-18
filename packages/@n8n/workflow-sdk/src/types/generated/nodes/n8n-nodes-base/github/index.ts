/**
 * GitHub Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { GithubV11Node } from './v11';

export * from './v11';

// Combined union type for all versions
export type GithubNode = GithubV11Node;