/**
 * Vector Store Question Answer Tool Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcToolVectorStoreV11Node } from './v11';
import type { LcToolVectorStoreV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcToolVectorStoreNode = LcToolVectorStoreV11Node | LcToolVectorStoreV1Node;