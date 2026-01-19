/**
 * Default Data Loader Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcDocumentDefaultDataLoaderV11Node } from './v11';
import type { LcDocumentDefaultDataLoaderV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcDocumentDefaultDataLoaderNode = LcDocumentDefaultDataLoaderV11Node | LcDocumentDefaultDataLoaderV1Node;