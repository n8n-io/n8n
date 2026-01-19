/**
 * Magento 2 Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { Magento2V1Node } from './v1';

export * from './v1';

// Combined union type for all versions
export type Magento2Node = Magento2V1Node;