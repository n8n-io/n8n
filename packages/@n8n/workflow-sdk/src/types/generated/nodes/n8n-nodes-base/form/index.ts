/**
 * n8n Form Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { FormV25Node } from './v25';

export * from './v25';

// Combined union type for all versions
export type FormNode = FormV25Node;