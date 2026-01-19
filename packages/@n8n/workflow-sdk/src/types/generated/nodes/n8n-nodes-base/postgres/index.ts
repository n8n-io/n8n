/**
 * Postgres Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { PostgresV26Node } from './v26';
import type { PostgresV25Node } from './v25';
import type { PostgresV24Node } from './v24';
import type { PostgresV23Node } from './v23';
import type { PostgresV22Node } from './v22';
import type { PostgresV21Node } from './v21';
import type { PostgresV2Node } from './v2';
import type { PostgresV1Node } from './v1';

export * from './v26';
export * from './v25';
export * from './v24';
export * from './v23';
export * from './v22';
export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type PostgresNode = PostgresV26Node | PostgresV25Node | PostgresV24Node | PostgresV23Node | PostgresV22Node | PostgresV21Node | PostgresV2Node | PostgresV1Node;