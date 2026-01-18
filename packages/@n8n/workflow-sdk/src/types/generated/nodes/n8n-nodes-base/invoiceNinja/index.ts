/**
 * Invoice Ninja Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { InvoiceNinjaV2Node } from './v2';
import type { InvoiceNinjaV1Node } from './v1';

export * from './v2';
export * from './v1';

// Combined union type for all versions
export type InvoiceNinjaNode = InvoiceNinjaV2Node | InvoiceNinjaV1Node;