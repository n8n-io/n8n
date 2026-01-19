/**
 * WhatsApp Business Cloud Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { WhatsAppV11Node } from './v11';
import type { WhatsAppV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type WhatsAppNode = WhatsAppV11Node | WhatsAppV1Node;