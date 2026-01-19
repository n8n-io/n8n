/**
 * MailerLite Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { MailerLiteTriggerV2Node } from './v2';
import type { MailerLiteTriggerV1Node } from './v1';

export * from './v2';
export * from './v1';

// Combined union type for all versions
export type MailerLiteTriggerNode = MailerLiteTriggerV2Node | MailerLiteTriggerV1Node;