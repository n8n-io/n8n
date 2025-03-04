/**
 * # Partial Execution Utilities
 *
 * This module provides utilities for partial workflow execution - a performance
 * optimization that allows n8n to execute only the necessary parts of a workflow
 * instead of re-executing the entire workflow.
 *
 * ## Key Components
 *
 * - **DirectedGraph**: Core data structure representing workflow as a directed graph
 * - **findStartNodes**: Identifies which nodes to start execution from
 * - **findSubgraph**: Creates a minimal graph between trigger and destination nodes
 * - **handleCycles**: Manages cyclic dependencies in the workflow graph
 * - **cleanRunData**: Prepares run data for partial execution
 * - **recreateNodeExecutionStack**: Rebuilds execution stack for partial runs
 *
 * ## Partial Execution Process
 *
 * ```mermaid
 * flowchart TD
 *     A[Start] --> B[Find Trigger]
 *     B --> C[Create Directed Graph]
 *     C --> D[Find Subgraph]
 *     D --> E[Find Start Nodes]
 *     E --> F[Handle Cycles]
 *     F --> G[Clean Run Data]
 *     G --> H[Recreate Execution Stack]
 *     H --> I[Execute Partial Workflow]
 * ```
 *
 * This system enables efficient workflow updates where only the affected parts
 * of a workflow need to be re-executed, significantly improving performance
 * for large workflows.
 */

export { DirectedGraph } from './directed-graph';
export { findTriggerForPartialExecution } from './find-trigger-for-partial-execution';
export { findStartNodes } from './find-start-nodes';
export { findSubgraph } from './find-subgraph';
export { recreateNodeExecutionStack } from './recreate-node-execution-stack';
export { cleanRunData } from './clean-run-data';
export { handleCycles } from './handle-cycles';
export { filterDisabledNodes } from './filter-disabled-nodes';
