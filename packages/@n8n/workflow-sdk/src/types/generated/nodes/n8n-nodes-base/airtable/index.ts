/**
 * Airtable Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { AirtableV21Node } from './v21';
import type { AirtableV1Node } from './v1';

export * from './v21';
export * from './v1';

// Combined union type for all versions
export type AirtableNode = AirtableV21Node | AirtableV1Node;