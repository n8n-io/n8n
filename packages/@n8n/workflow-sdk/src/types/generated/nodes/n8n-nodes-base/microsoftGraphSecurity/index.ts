/**
 * Microsoft Graph Security Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { MicrosoftGraphSecurityV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type MicrosoftGraphSecurityNode = MicrosoftGraphSecurityV1Node;