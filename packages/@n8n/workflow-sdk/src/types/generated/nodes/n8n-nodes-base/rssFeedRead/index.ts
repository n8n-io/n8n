/**
 * RSS Read Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { RssFeedReadV12Node } from './v12';
import type { RssFeedReadV11Node } from './v11';
import type { RssFeedReadV1Node } from './v1';

export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type RssFeedReadNode = RssFeedReadV12Node | RssFeedReadV11Node | RssFeedReadV1Node;