/**
 * Execute Sub-workflow Node Types
 *
 * Re-exports all version-specific types and provides combined union type.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

import type { ExecuteWorkflowV13Node } from './v13';
import type { ExecuteWorkflowV12Node } from './v12';
import type { ExecuteWorkflowV11Node } from './v11';
import type { ExecuteWorkflowV1Node } from './v1';

export * from './v13';
export * from './v12';
export * from './v11';
export * from './v1';

// Combined union type for all versions
export type ExecuteWorkflowNode = ExecuteWorkflowV13Node | ExecuteWorkflowV12Node | ExecuteWorkflowV11Node | ExecuteWorkflowV1Node;