/**
 * Microsoft Outlook Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { MicrosoftOutlookV2Node } from './v2';
import type { MicrosoftOutlookV1Node } from './v1';

export * from './v2';
export * from './v1';

// Combined union type for all versions
export type MicrosoftOutlookNode = MicrosoftOutlookV2Node | MicrosoftOutlookV1Node;