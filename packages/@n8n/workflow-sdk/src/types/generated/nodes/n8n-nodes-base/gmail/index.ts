/**
 * Gmail Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { GmailV22Node } from './v22';
import type { GmailV1Node } from './v1';

export * from './v22';
export * from './v1';

// Combined union type for all versions
export type GmailNode = GmailV22Node | GmailV1Node;