/**
 * Postgres Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { PostgresV26Node } from './v26';
import type { PostgresV1Node } from './v1';

export * from './v26';
export * from './v1';

// Combined union type for all versions
export type PostgresNode = PostgresV26Node | PostgresV1Node;