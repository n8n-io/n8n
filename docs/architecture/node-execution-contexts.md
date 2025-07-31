# Node Execution Contexts

> **⚠️ Notice**: This documentation was created by AI and not properly reviewed by the team yet.

## Overview

n8n provides different execution contexts for nodes depending on their type and execution phase. Each context provides specific APIs and capabilities tailored to the node's requirements. Understanding these contexts is crucial for node development and debugging.

## TODO: Document the Following

### Context Types

#### ExecuteContext
- **Location**: `/packages/core/src/execution-engine/node-execution-context/execute-context.ts`
- **Used by**: Regular nodes during execution
- **Key APIs**: getInputData(), getNodeParameter(), sendMessageToUI()
- **Purpose**: Standard node execution with full data processing capabilities

#### ExecuteSingleContext
- **Location**: `/packages/core/src/execution-engine/node-execution-context/execute-single-context.ts`
- **Used by**: Nodes processing individual items
- **Key difference**: Processes one item at a time
- **Use case**: Memory-efficient processing of large datasets

#### TriggerContext
- **Location**: `/packages/core/src/execution-engine/node-execution-context/trigger-context.ts`
- **Used by**: Trigger nodes (polling-based)
- **Special APIs**: emit(), getMode(), getActivationMode()
- **Purpose**: Long-running nodes that initiate workflow execution

#### WebhookContext
- **Location**: `/packages/core/src/execution-engine/node-execution-context/webhook-context.ts`
- **Used by**: Webhook trigger nodes
- **Key APIs**: getRequestObject(), getResponseObject(), getHeaderData()
- **Purpose**: Handle incoming HTTP requests

#### PollContext
- **Location**: `/packages/core/src/execution-engine/node-execution-context/poll-context.ts`
- **Used by**: Polling trigger nodes
- **Key feature**: Periodic execution
- **State management**: getNodeStaticData(), setNodeStaticData()

#### LoadOptionsContext
- **Location**: `/packages/core/src/execution-engine/node-execution-context/load-options-context.ts`
- **Used by**: Dynamic option loading in node parameters
- **Purpose**: Fetch dynamic dropdown options
- **Key API**: getCurrentNodeParameters()

#### SupplyDataContext
- **Location**: `/packages/core/src/execution-engine/node-execution-context/supply-data-context.ts`
- **Used by**: Sub-nodes and special execution nodes
- **Purpose**: Provide data to other nodes
- **Example**: Loop nodes, sub-workflow nodes

### Common APIs Across Contexts

#### Helper Functions
- **Binary data**: getBinaryDataBuffer(), prepareBinaryData()
- **Credentials**: getCredentials()
- **HTTP requests**: httpRequest(), requestWithAuthentication()
- **Workflow data**: getWorkflowDataProxy(), getInputData()
- **Parameters**: getNodeParameter(), evaluateExpression()

#### Context-Specific Limitations
- Which helpers are available in each context
- Memory and execution time limits
- Access to workflow state
- Available data scopes

### Base Classes and Inheritance

#### NodeExecutionContext (Base)
- **Location**: `/packages/core/src/execution-engine/node-execution-context/node-execution-context.ts`
- Common functionality across all contexts
- Shared utilities and helpers

#### BaseExecuteContext
- **Location**: `/packages/core/src/execution-engine/node-execution-context/base-execute-context.ts`
- Base for execution contexts
- Item indexing and data handling

### Context Lifecycle

1. **Context Creation**
   - When contexts are instantiated
   - Parameter initialization
   - Dependency injection

2. **Execution Phase**
   - Available data and methods
   - State management
   - Error handling

3. **Cleanup**
   - Resource disposal
   - State persistence
   - Memory management

### Advanced Features

#### Static Data
- Purpose and usage
- Persistence between executions
- Limitations and best practices

#### Continual Execution
- How contexts handle long-running operations
- Workflow activation/deactivation
- Resource management

## Key Questions to Answer

1. When should each context type be used?
2. What APIs are exclusive to specific contexts?
3. How do contexts handle state between executions?
4. What are the memory and performance implications?
5. How do contexts interact with the workflow engine?
6. What security restrictions apply to each context?
7. How can custom helpers be added to contexts?
8. What are the testing strategies for different contexts?

## Related Documentation

- [Workflow Execution Engine](./workflow-execution-engine.md) - How contexts fit into execution
- [Node Development](./node-development.md) - Using contexts in custom nodes
- [Expression System](./expression-system.md) - Expression evaluation in contexts

## Code Locations to Explore

- `/packages/core/src/execution-engine/node-execution-context/` - All context implementations
- `/packages/core/src/node-execute-functions.ts` - Helper function implementations
- `/packages/workflow/src/interfaces.ts` - Context interface definitions
- Context test files for usage examples
