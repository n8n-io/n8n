/**
 * Pipedrive Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { PipedriveV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type PipedriveNode = PipedriveV1Node;