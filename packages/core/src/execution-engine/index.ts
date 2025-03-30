/**
 * # n8n Execution Engine
 *
 * This module contains the core components of n8n's workflow execution engine.
 * The execution engine is responsible for running workflows, managing active workflows,
 * handling triggers, and providing execution contexts for different node types.
 *
 * ## Key Components
 *
 * - {@link ActiveWorkflows}: Manages workflows that are currently active/running
 * - {@link WorkflowExecute}: Core workflow execution logic
 * - {@link TriggersAndPollers}: Handles trigger nodes and polling operations
 * - {@link ExecutionLifecycleHooks}: Provides hooks for workflow execution lifecycle events
 * - {@link RoutingNode}: Routes execution based on node type and implementation
 *
 * ## Execution Modes
 *
 * - **Full Execution**: Executes the entire workflow from start to finish
 * - **Partial Execution**: Executes only parts of the workflow that need to be updated
 *
 * @module executionEngine
 */

export { ActiveWorkflows } from './active-workflows';
export * from './interfaces';
export * from './routing-node';
export * from './node-execution-context';
export * from './partial-execution-utils';
export * from './node-execution-context/utils/execution-metadata';
export { WorkflowExecute } from './workflow-execute';
export { ExecutionLifecycleHooks } from './execution-lifecycle-hooks';
