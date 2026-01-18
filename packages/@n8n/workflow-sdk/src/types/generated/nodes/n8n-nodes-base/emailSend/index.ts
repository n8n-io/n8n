/**
 * Send Email Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { EmailSendV21Node } from './v21';
import type { EmailSendV2Node } from './v2';
import type { EmailSendV1Node } from './v1';

export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type EmailSendNode = EmailSendV21Node | EmailSendV2Node | EmailSendV1Node;