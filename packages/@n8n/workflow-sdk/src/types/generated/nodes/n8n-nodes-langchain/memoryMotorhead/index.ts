/**
 * Motorhead Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcMemoryMotorheadV13Node } from './v13';
import type { LcMemoryMotorheadV12Node } from './v12';
import type { LcMemoryMotorheadV11Node } from './v11';
import type { LcMemoryMotorheadV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcMemoryMotorheadNode = LcMemoryMotorheadV13Node | LcMemoryMotorheadV12Node | LcMemoryMotorheadV11Node | LcMemoryMotorheadV1Node;