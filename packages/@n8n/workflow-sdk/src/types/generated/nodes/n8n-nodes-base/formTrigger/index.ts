/**
 * n8n Form Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { FormTriggerV25Node } from './v25';
import type { FormTriggerV24Node } from './v24';
import type { FormTriggerV23Node } from './v23';
import type { FormTriggerV22Node } from './v22';
import type { FormTriggerV21Node } from './v21';
import type { FormTriggerV2Node } from './v2';
import type { FormTriggerV1Node } from './v1';

export * from './v25';
export * from './v24';
export * from './v23';
export * from './v22';
export * from './v21';
export * from './v2';
export * from './v1';

// Combined union type for all versions
export type FormTriggerNode = FormTriggerV25Node | FormTriggerV24Node | FormTriggerV23Node | FormTriggerV22Node | FormTriggerV21Node | FormTriggerV2Node | FormTriggerV1Node;