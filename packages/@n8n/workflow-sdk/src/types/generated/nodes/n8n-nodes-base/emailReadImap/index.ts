/**
 * Email Trigger (IMAP) Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { EmailReadImapV21Node } from './v21';
import type { EmailReadImapV2Node } from './v2';
import type { EmailReadImapV1Node } from './v1';

export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type EmailReadImapNode = EmailReadImapV21Node | EmailReadImapV2Node | EmailReadImapV1Node;