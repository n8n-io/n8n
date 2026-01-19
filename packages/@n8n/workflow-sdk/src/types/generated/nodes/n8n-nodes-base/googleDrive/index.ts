/**
 * Google Drive Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { GoogleDriveV3Node } from './v3';
import type { GoogleDriveV2Node } from './v2';
import type { GoogleDriveV1Node } from './v1';

export * from './v3';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type GoogleDriveNode = GoogleDriveV3Node | GoogleDriveV2Node | GoogleDriveV1Node;