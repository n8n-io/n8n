/**
 * Call n8n Workflow Tool Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { LcToolWorkflowV22Node } from './v22';
import type { LcToolWorkflowV13Node } from './v13';

export * from './v22';
export * from './v13';

// Combined union type for all versions
export type LcToolWorkflowNode = LcToolWorkflowV22Node | LcToolWorkflowV13Node;