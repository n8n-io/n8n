/**
 * Google Translate Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { GoogleTranslateV2Node } from './v2';
import type { GoogleTranslateV1Node } from './v1';

export * from './v2';
export * from './v1';

// Combined union type for all versions
export type GoogleTranslateNode = GoogleTranslateV2Node | GoogleTranslateV1Node;