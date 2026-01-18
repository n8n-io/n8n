/**
 * Execution Data Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { ExecutionDataV11Node } from './v11';
import type { ExecutionDataV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type ExecutionDataNode = ExecutionDataV11Node | ExecutionDataV1Node;