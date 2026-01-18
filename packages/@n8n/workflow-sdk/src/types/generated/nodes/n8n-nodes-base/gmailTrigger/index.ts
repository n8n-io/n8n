/**
 * Gmail Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { GmailTriggerV13Node } from './v13';
import type { GmailTriggerV12Node } from './v12';
import type { GmailTriggerV11Node } from './v11';
import type { GmailTriggerV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type GmailTriggerNode = GmailTriggerV13Node | GmailTriggerV12Node | GmailTriggerV11Node | GmailTriggerV1Node;