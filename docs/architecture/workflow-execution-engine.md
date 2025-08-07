# Workflow Execution Engine

> **⚠️ Notice**: This documentation was created by AI and not properly reviewed by the team yet.

## Overview

The workflow execution engine is the heart of n8n, responsible for orchestrating the execution of nodes in a workflow. This document explains how workflows are executed, the key data structures involved, and the execution lifecycle.

## TODO: Document the Following

### Core Data Structures

#### INodeExecutionData
- **Purpose**: Represents the data output from a single node execution
- **Key fields**: json, binary, pairedItem, error
- **Location**: `/packages/workflow/src/interfaces.ts:1210`
- **Usage patterns**: How nodes produce and consume this data

#### IExecuteData
- **Purpose**: Contains execution context for a single node
- **Fields**: data (ITaskDataConnections), node, source, metadata
- **Location**: `/packages/workflow/src/interfaces.ts:419`
- **Key concept**: Represents what a node needs to execute

#### IRunExecutionData
- **Purpose**: Tracks the complete state of a workflow execution
- **Fields**: startData, resultData (runData, pinData, error), waitingExecution
- **Location**: `/packages/workflow/src/interfaces.ts:2225`
- **Usage**: Enables execution resumption and state persistence

#### IWorkflowExecuteAdditionalData
- **Purpose**: Provides context and utilities during workflow execution
- **Key methods**: executeWorkflow, credentialsHelper, hooks
- **Location**: `/packages/workflow/src/interfaces.ts:2467`
- **Usage**: Dependency injection for execution context

### Execution Architecture

#### WorkflowExecute Class
- **Location**: `/packages/core/src/execution-engine/workflow-execute.ts`
- **Responsibilities**:
  - Node execution orchestration
  - Data flow management
  - Error handling and recovery
  - Execution state tracking

#### Execution Modes
- Manual execution
- Trigger-based execution
- Sub-workflow execution
- Partial execution (from specific node)
- Testing/evaluation mode

#### Node Execution Stack
- How the execution order is determined
- Stack manipulation for partial execution
- Handling of parallel branches
- Loop detection and prevention

### Data Flow

#### Connection Types
- Main connections (primary data flow)
- Error connections
- Multiple outputs handling

#### Data Transformation
- How data flows between nodes
- Item-based processing
- Pairing and unpacking items
- Binary data handling

### Error Handling
- Error propagation through workflow
- Error branches and recovery
- Retry mechanisms
- Execution state on failure

### Performance Considerations
- Memory management for large datasets
- Streaming capabilities
- Execution optimization strategies
- Caching mechanisms

## Key Questions to Answer

1. How does the execution engine determine node execution order?
2. What happens when a node has multiple inputs?
3. How is execution state persisted and resumed?
4. How are loops and cycles prevented?
5. What's the difference between partial and full execution?
6. How does data transformation work between nodes?
7. How are errors handled and propagated?
8. What optimizations exist for large data processing?

## Related Documentation

- [Node Execution Contexts](./node-execution-contexts.md) - Different execution contexts
- [Data Flow](./data-flow.md) - Detailed data flow documentation
- [Expression System](./expression-system.md) - Expression evaluation during execution

## Code Locations to Explore

- `/packages/core/src/execution-engine/workflow-execute.ts` - Main execution engine
- `/packages/core/src/execution-engine/partial-execution-utils/` - Partial execution logic
- `/packages/workflow/src/workflow.ts` - Workflow class and graph operations
- `/packages/workflow/src/interfaces.ts` - Core interface definitions
- `/packages/core/src/node-execute-functions.ts` - Node execution helpers