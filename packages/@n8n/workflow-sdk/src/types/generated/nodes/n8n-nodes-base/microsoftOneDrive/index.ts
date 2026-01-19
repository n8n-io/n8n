/**
 * Microsoft OneDrive Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { MicrosoftOneDriveV11Node } from './v11';
import type { MicrosoftOneDriveV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type MicrosoftOneDriveNode = MicrosoftOneDriveV11Node | MicrosoftOneDriveV1Node;