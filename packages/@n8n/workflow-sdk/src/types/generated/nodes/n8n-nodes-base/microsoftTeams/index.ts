/**
 * Microsoft Teams Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { MicrosoftTeamsV2Node } from './v2';
import type { MicrosoftTeamsV11Node } from './v11';

export * from './v2';
export * from './v11';

// Combined union type for all versions
export type MicrosoftTeamsNode = MicrosoftTeamsV2Node | MicrosoftTeamsV11Node;