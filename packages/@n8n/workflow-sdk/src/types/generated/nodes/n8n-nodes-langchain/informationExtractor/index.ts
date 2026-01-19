/**
 * Information Extractor Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcInformationExtractorV12Node } from './v12';
import type { LcInformationExtractorV11Node } from './v11';
import type { LcInformationExtractorV1Node } from './v1';

export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcInformationExtractorNode = LcInformationExtractorV12Node | LcInformationExtractorV11Node | LcInformationExtractorV1Node;