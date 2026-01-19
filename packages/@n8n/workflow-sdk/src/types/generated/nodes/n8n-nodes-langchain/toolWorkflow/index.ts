/**
 * Call n8n Workflow Tool Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcToolWorkflowV22Node } from './v22';
import type { LcToolWorkflowV21Node } from './v21';
import type { LcToolWorkflowV2Node } from './v2';
import type { LcToolWorkflowV13Node } from './v13';
import type { LcToolWorkflowV12Node } from './v12';
import type { LcToolWorkflowV11Node } from './v11';
import type { LcToolWorkflowV1Node } from './v1';

export * from './v22';
export * from './v21';
export * from './v2';
export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcToolWorkflowNode = LcToolWorkflowV22Node | LcToolWorkflowV21Node | LcToolWorkflowV2Node | LcToolWorkflowV13Node | LcToolWorkflowV12Node | LcToolWorkflowV11Node | LcToolWorkflowV1Node;