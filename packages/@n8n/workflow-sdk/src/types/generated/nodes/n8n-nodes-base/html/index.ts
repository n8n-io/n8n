/**
 * HTML Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { HtmlV12Node } from './v12';
import type { HtmlV11Node } from './v11';
import type { HtmlV1Node } from './v1';

export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type HtmlNode = HtmlV12Node | HtmlV11Node | HtmlV1Node;