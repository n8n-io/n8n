/**
 * S3 Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { S3V1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type S3Node = S3V1Node;