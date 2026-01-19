/**
 * Code Tool Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcToolCodeV13Node } from './v13';
import type { LcToolCodeV12Node } from './v12';
import type { LcToolCodeV11Node } from './v11';
import type { LcToolCodeV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcToolCodeNode = LcToolCodeV13Node | LcToolCodeV12Node | LcToolCodeV11Node | LcToolCodeV1Node;