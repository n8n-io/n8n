/**
 * AWS DynamoDB Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { AwsDynamoDbV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type AwsDynamoDbNode = AwsDynamoDbV1Node;