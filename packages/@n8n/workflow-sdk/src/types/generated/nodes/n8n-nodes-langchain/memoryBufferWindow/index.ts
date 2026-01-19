/**
 * Simple Memory Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcMemoryBufferWindowV13Node } from './v13';
import type { LcMemoryBufferWindowV12Node } from './v12';
import type { LcMemoryBufferWindowV11Node } from './v11';
import type { LcMemoryBufferWindowV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcMemoryBufferWindowNode = LcMemoryBufferWindowV13Node | LcMemoryBufferWindowV12Node | LcMemoryBufferWindowV11Node | LcMemoryBufferWindowV1Node;