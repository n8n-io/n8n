/**
 * Slack Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { SlackV24Node } from './v24';
import type { SlackV1Node } from './v1';

export * from './v24';
export * from './v1';

// Combined union type for all versions
export type SlackNode = SlackV24Node | SlackV1Node;