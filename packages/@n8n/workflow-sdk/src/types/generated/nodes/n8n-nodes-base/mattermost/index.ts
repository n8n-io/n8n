/**
 * Mattermost Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { MattermostV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type MattermostNode = MattermostV1Node;