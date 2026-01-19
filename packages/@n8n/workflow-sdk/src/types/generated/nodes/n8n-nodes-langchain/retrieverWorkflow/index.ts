/**
 * Workflow Retriever Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { LcRetrieverWorkflowV11Node } from './v11';
import type { LcRetrieverWorkflowV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type LcRetrieverWorkflowNode = LcRetrieverWorkflowV11Node | LcRetrieverWorkflowV1Node;