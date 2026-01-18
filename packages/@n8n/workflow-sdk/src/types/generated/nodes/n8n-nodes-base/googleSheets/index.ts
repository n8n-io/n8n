/**
 * Google Sheets Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { GoogleSheetsV47Node } from './v47';
import type { GoogleSheetsV2Node } from './v2';

export * from './v47';
export * from './v2';

// Combined union type for all versions
export type GoogleSheetsNode = GoogleSheetsV47Node | GoogleSheetsV2Node;