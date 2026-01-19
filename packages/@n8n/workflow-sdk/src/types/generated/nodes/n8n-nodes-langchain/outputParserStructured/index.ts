/**
 * Structured Output Parser Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcOutputParserStructuredV13Node } from './v13';
import type { LcOutputParserStructuredV12Node } from './v12';
import type { LcOutputParserStructuredV11Node } from './v11';
import type { LcOutputParserStructuredV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcOutputParserStructuredNode = LcOutputParserStructuredV13Node | LcOutputParserStructuredV12Node | LcOutputParserStructuredV11Node | LcOutputParserStructuredV1Node;