/**
 * Gmail Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { GmailV22Node } from './v22';
import type { GmailV21Node } from './v21';
import type { GmailV2Node } from './v2';
import type { GmailV1Node } from './v1';

export * from './v22';
export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type GmailNode = GmailV22Node | GmailV21Node | GmailV2Node | GmailV1Node;