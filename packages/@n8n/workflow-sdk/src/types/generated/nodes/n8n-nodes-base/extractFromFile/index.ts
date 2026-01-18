/**
 * Extract from File Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { ExtractFromFileV11Node } from './v11';
import type { ExtractFromFileV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type ExtractFromFileNode = ExtractFromFileV11Node | ExtractFromFileV1Node;