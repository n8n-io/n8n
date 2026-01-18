/**
 * Compare Datasets Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { CompareDatasetsV23Node } from './v23';

export * from './v23';

// Combined union type for all versions
export type CompareDatasetsNode = CompareDatasetsV23Node;