/**
 * Email Trigger (IMAP) Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { EmailReadImapV21Node } from './v21';
import type { EmailReadImapV1Node } from './v1';

export * from './v21';
export * from './v1';

// Combined union type for all versions
export type EmailReadImapNode = EmailReadImapV21Node | EmailReadImapV1Node;