/**
 * Google BigQuery Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { GoogleBigQueryV21Node } from './v21';
import type { GoogleBigQueryV2Node } from './v2';
import type { GoogleBigQueryV1Node } from './v1';

export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type GoogleBigQueryNode = GoogleBigQueryV21Node | GoogleBigQueryV2Node | GoogleBigQueryV1Node;