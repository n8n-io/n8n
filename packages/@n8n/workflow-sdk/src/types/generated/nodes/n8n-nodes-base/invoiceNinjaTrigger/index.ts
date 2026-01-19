/**
 * Invoice Ninja Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { InvoiceNinjaTriggerV2Node } from './v2';
import type { InvoiceNinjaTriggerV1Node } from './v1';

export * from './v2';
export * from './v1';

// Combined union type for all versions
export type InvoiceNinjaTriggerNode = InvoiceNinjaTriggerV2Node | InvoiceNinjaTriggerV1Node;