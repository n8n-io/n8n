# TypeScript and Mocking Guidelines for Tests

This document captures common patterns and solutions for TypeScript and mocking issues in our test files. We've extracted common patterns to `test-utils.ts` to simplify writing tests across the codebase.

## Using the Test Utilities

### Setting Up a Test File

```typescript
import { getCurrentTaskInput } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';

import { createYourTool } from '../../src/tools/your-tool.tool';
import { 
  createNode, 
  createWorkflow, 
  nodeTypes,
  parseToolResult,
  extractProgressMessages,
  findProgressMessage,
  createToolConfigWithWriter,
  createToolConfig,
  setupWorkflowState,
  expectToolSuccess,
  expectToolError,
  expectNodeAdded,
  buildAddNodeInput,
  REASONING,
  type ParsedToolContent,
} from '../test-utils';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
  getCurrentTaskInput: jest.fn(),
  Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
    content: JSON.stringify(params),
  })),
}));

// Mock crypto module if needed
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn().mockReturnValue('test-uuid-123'),
}));

describe('YourTool', () => {
  let tool: ReturnType<typeof createYourTool>;
  const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<typeof getCurrentTaskInput>;

  beforeEach(() => {
    jest.clearAllMocks();
    tool = createYourTool(/* dependencies */);
  });
});
```

### Common Test Patterns

#### 1. Basic Tool Invocation

```typescript
it('should handle basic operation', async () => {
  // Setup workflow state
  setupWorkflowState(mockGetCurrentTaskInput);

  // Create tool config
  const mockConfig = createToolConfig('tool_name', 'test-call-1');

  // Invoke tool
  const result = await tool.invoke({ /* your input */ }, mockConfig);

  // Parse and assert
  const content = parseToolResult<ParsedToolContent>(result);
  expectToolSuccess(content, 'Expected success message');
});
```

#### 2. Tool with Progress Tracking

```typescript
it('should track progress', async () => {
  setupWorkflowState(mockGetCurrentTaskInput);
  
  // Use config with writer for progress tracking
  const mockConfig = createToolConfigWithWriter('tool_name', 'test-call-1');

  const result = await tool.invoke({ /* input */ }, mockConfig);
  const content = parseToolResult<ParsedToolContent>(result);

  // Extract and verify progress messages
  const progressCalls = extractProgressMessages(mockConfig.writer);
  expect(progressCalls.length).toBeGreaterThanOrEqual(3);

  const startMessage = findProgressMessage(progressCalls, 'running', 'input');
  expect(startMessage).toBeDefined();

  const completeMessage = findProgressMessage(progressCalls, 'completed');
  expect(completeMessage).toBeDefined();
});
```

#### 3. Testing Add Node Operations

```typescript
it('should add a node', async () => {
  setupWorkflowState(mockGetCurrentTaskInput);
  const mockConfig = createToolConfig('add_nodes');

  const result = await addNodeTool.invoke(
    buildAddNodeInput({
      nodeType: 'n8n-nodes-base.code',
      name: 'Process Data',
      connectionParametersReasoning: REASONING.STATIC_NODE,
    }),
    mockConfig,
  );

  const content = parseToolResult<ParsedToolContent>(result);
  
  // Use the expectNodeAdded assertion
  expectNodeAdded(content, {
    name: 'Process Data',
    type: 'n8n-nodes-base.code',
    parameters: {},
  });

  // Success message check
  expectToolSuccess(content, 'Successfully added "Process Data"');
});
```

#### 4. Testing Error Cases

```typescript
it('should handle errors', async () => {
  setupWorkflowState(mockGetCurrentTaskInput);
  const mockConfig = createToolConfig('tool_name');

  const result = await tool.invoke({ /* invalid input */ }, mockConfig);
  
  const content = parseToolResult<ParsedToolContent>(result);
  expectToolError(content, 'Error: Expected error message');
});
```

#### 5. Setting Up Complex Workflow State

```typescript
it('should work with existing nodes', async () => {
  const existingWorkflow = createWorkflow([
    createNode({ id: 'node1', name: 'Code', position: [100, 100] }),
    createNode({ id: 'node2', name: 'Set', position: [300, 100] }),
  ]);
  
  setupWorkflowState(mockGetCurrentTaskInput, existingWorkflow);
  
  // ... rest of test
});
```

## Available Utilities

### State Setup
- `setupWorkflowState()` - Configure mockGetCurrentTaskInput with a workflow
- `createWorkflow()` - Create a workflow with nodes
- `createNode()` - Create a node with defaults

### Tool Config
- `createToolConfig()` - Basic tool config
- `createToolConfigWithWriter()` - Tool config with progress writer

### Result Parsing
- `parseToolResult()` - Parse double-wrapped tool results
- `extractProgressMessages()` - Extract progress messages from writer
- `findProgressMessage()` - Find specific progress message

### Assertions
- `expectToolSuccess()` - Assert success message
- `expectToolError()` - Assert error message
- `expectWorkflowOperation()` - Assert workflow operation type
- `expectNodeAdded()` - Assert node was added with properties

### Test Data Builders
- `buildAddNodeInput()` - Build input for add node tool
- `REASONING` - Common reasoning strings for connection parameters

## Best Practices

1. **Use the utilities** - Don't recreate these patterns in each test
2. **Setup workflow state first** - Always call `setupWorkflowState()` before invoking tools
3. **Use type-safe parsing** - Always specify the generic type when using `parseToolResult<T>()`
4. **Use assertion helpers** - Prefer `expectToolSuccess()` over manual message checking
5. **Use builders for complex inputs** - Use `buildAddNodeInput()` for consistency
6. **Extract only what you need** - Don't parse the entire result if you only need the message

## Common Pitfalls to Avoid

1. **Don't forget to mock LangGraph** - The mock must be defined before imports
2. **Don't access nested properties without optional chaining** - Use `?.` for safety
3. **Don't use `any` type** - Use proper type assertions or utility types
4. **Don't forget to clear mocks** - Always call `jest.clearAllMocks()` in beforeEach
5. **Don't hardcode test IDs** - Pass unique test call IDs to avoid conflicts

## Migration Guide

If you're updating an existing test file:

1. Remove type definitions for `MockedCommandResult` and `ParsedContent`
2. Replace manual parsing with `parseToolResult()`
3. Replace manual workflow state setup with `setupWorkflowState()`
4. Replace manual config creation with `createToolConfig()` or `createToolConfigWithWriter()`
5. Replace manual assertions with utility assertions like `expectToolSuccess()`
6. Use `buildAddNodeInput()` for consistent add node inputs

## Example: Complete Test File

```typescript
import { getCurrentTaskInput } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';

import { createAddNodeTool } from '../../src/tools/add-node.tool';
import {
  nodeTypes,
  parseToolResult,
  createToolConfig,
  setupWorkflowState,
  expectToolSuccess,
  expectNodeAdded,
  buildAddNodeInput,
  REASONING,
  type ParsedToolContent,
} from '../test-utils';

jest.mock('@langchain/langgraph', () => ({
  getCurrentTaskInput: jest.fn(),
  Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
    content: JSON.stringify(params),
  })),
}));

describe('AddNodeTool', () => {
  let nodeTypesList: INodeTypeDescription[];
  let addNodeTool: ReturnType<typeof createAddNodeTool>;
  const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<typeof getCurrentTaskInput>;

  beforeEach(() => {
    jest.clearAllMocks();
    nodeTypesList = [nodeTypes.code, nodeTypes.httpRequest];
    addNodeTool = createAddNodeTool(nodeTypesList);
  });

  it('should add a node', async () => {
    setupWorkflowState(mockGetCurrentTaskInput);
    const mockConfig = createToolConfig('add_nodes');

    const result = await addNodeTool.invoke(
      buildAddNodeInput({
        nodeType: 'n8n-nodes-base.code',
        name: 'Process Data',
      }),
      mockConfig,
    );

    const content = parseToolResult<ParsedToolContent>(result);
    
    expectNodeAdded(content, {
      name: 'Process Data',
      type: 'n8n-nodes-base.code',
      parameters: {},
    });
    
    expectToolSuccess(content, 'Successfully added "Process Data"');
  });
});
```

This approach significantly reduces boilerplate and ensures consistency across all tool tests.