/**
 * Execute Workflow Trigger Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 */

import type { ExecuteWorkflowTriggerV11Node } from './v11';
import type { ExecuteWorkflowTriggerV1Node } from './v1';

export * from './v11';
export * from './v1';

// Combined union type for all versions
export type ExecuteWorkflowTriggerNode = ExecuteWorkflowTriggerV11Node | ExecuteWorkflowTriggerV1Node;