/**
 * Google Slides Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { GoogleSlidesV2Node } from './v2';

export * from './v2';

// Combined union type for all versions
export type GoogleSlidesNode = GoogleSlidesV2Node;