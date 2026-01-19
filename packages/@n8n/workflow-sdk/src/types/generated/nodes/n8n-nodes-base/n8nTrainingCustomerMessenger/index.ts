/**
 * Customer Messenger (n8n training) Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { N8nTrainingCustomerMessengerV1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type N8nTrainingCustomerMessengerNode = N8nTrainingCustomerMessengerV1Node;