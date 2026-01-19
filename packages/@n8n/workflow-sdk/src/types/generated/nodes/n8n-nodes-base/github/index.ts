/**
 * GitHub Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { GithubV11Node } from './v11';
import type { GithubV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type GithubNode = GithubV11Node | GithubV1Node;