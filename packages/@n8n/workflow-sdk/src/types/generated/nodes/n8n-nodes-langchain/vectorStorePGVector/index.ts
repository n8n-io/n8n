/**
 * Postgres PGVector Store Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcVectorStorePGVectorV13Node } from './v13';
import type { LcVectorStorePGVectorV12Node } from './v12';
import type { LcVectorStorePGVectorV11Node } from './v11';
import type { LcVectorStorePGVectorV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcVectorStorePGVectorNode = LcVectorStorePGVectorV13Node | LcVectorStorePGVectorV12Node | LcVectorStorePGVectorV11Node | LcVectorStorePGVectorV1Node;