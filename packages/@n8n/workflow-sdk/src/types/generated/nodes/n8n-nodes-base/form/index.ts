/**
 * n8n Form Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { FormV25Node } from './v25';
import type { FormV24Node } from './v24';
import type { FormV23Node } from './v23';
import type { FormV1Node } from './v1';

export * from './v25';
export * from './v24';
export * from './v23';
export * from './v1';

// Combined union type for all versions
export type FormNode = FormV25Node | FormV24Node | FormV23Node | FormV1Node;