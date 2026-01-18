/**
 * Stop and Error Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { StopAndErrorV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type StopAndErrorNode = StopAndErrorV1Node;