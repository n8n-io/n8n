/**
 * Mindee Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { MindeeV3Node } from './v3';

export * from './v3';

// Combined union type for all versions
export type MindeeNode = MindeeV3Node;