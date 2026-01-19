/**
 * Google Sheets Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { GoogleSheetsV47Node } from './v47';
import type { GoogleSheetsV46Node } from './v46';
import type { GoogleSheetsV45Node } from './v45';
import type { GoogleSheetsV44Node } from './v44';
import type { GoogleSheetsV43Node } from './v43';
import type { GoogleSheetsV42Node } from './v42';
import type { GoogleSheetsV41Node } from './v41';
import type { GoogleSheetsV4Node } from './v4';
import type { GoogleSheetsV3Node } from './v3';
import type { GoogleSheetsV2Node } from './v2';
import type { GoogleSheetsV1Node } from './v1';

export * from './v47';
export * from './v46';
export * from './v45';
export * from './v44';
export * from './v43';
export * from './v42';
export * from './v41';
export * from './v4';
export * from './v3';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type GoogleSheetsNode = GoogleSheetsV47Node | GoogleSheetsV46Node | GoogleSheetsV45Node | GoogleSheetsV44Node | GoogleSheetsV43Node | GoogleSheetsV42Node | GoogleSheetsV41Node | GoogleSheetsV4Node | GoogleSheetsV3Node | GoogleSheetsV2Node | GoogleSheetsV1Node;