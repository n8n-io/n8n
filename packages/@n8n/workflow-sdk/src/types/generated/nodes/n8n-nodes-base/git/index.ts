/**
 * Git Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { GitV11Node } from './v11';
import type { GitV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type GitNode = GitV11Node | GitV1Node;