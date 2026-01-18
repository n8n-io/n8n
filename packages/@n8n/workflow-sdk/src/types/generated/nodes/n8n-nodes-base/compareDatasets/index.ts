/**
 * Compare Datasets Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { CompareDatasetsV23Node } from './v23';
import type { CompareDatasetsV22Node } from './v22';
import type { CompareDatasetsV21Node } from './v21';
import type { CompareDatasetsV2Node } from './v2';
import type { CompareDatasetsV1Node } from './v1';

export * from './v23';
export * from './v22';
export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type CompareDatasetsNode = CompareDatasetsV23Node | CompareDatasetsV22Node | CompareDatasetsV21Node | CompareDatasetsV2Node | CompareDatasetsV1Node;