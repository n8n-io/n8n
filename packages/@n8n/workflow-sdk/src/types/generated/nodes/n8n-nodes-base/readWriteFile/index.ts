/**
 * Read/Write Files from Disk Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { ReadWriteFileV11Node } from './v11';
import type { ReadWriteFileV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type ReadWriteFileNode = ReadWriteFileV11Node | ReadWriteFileV1Node;