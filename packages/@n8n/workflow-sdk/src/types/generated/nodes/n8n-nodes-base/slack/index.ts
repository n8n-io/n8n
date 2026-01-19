/**
 * Slack Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { SlackV24Node } from './v24';
import type { SlackV23Node } from './v23';
import type { SlackV22Node } from './v22';
import type { SlackV21Node } from './v21';
import type { SlackV2Node } from './v2';
import type { SlackV1Node } from './v1';

export * from './v24';
export * from './v23';
export * from './v22';
export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type SlackNode = SlackV24Node | SlackV23Node | SlackV22Node | SlackV21Node | SlackV2Node | SlackV1Node;