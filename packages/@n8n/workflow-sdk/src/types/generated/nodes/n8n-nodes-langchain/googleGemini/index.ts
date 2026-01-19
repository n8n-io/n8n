/**
 * Google Gemini Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcGoogleGeminiV11Node } from './v11';
import type { LcGoogleGeminiV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcGoogleGeminiNode = LcGoogleGeminiV11Node | LcGoogleGeminiV1Node;