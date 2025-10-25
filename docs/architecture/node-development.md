# Node Development Guide

> **⚠️ Notice**: This document was created by AI and not properly reviewed by the team yet.

## Overview

This document covers the architecture and development patterns for creating n8n nodes. Nodes are the building blocks of workflows, each providing specific functionality for data processing, API integration, or workflow control.

## TODO: Document the Following

### Node Architecture

#### Node Types

##### Regular Nodes
- **Interface**: `INodeType`
- **Method**: `execute()`
- **Purpose**: Data processing and transformation
- **Examples**: HTTP Request, Set, Function

##### Trigger Nodes
- **Interface**: `ITriggerNode`
- **Methods**: `trigger()` or `poll()`
- **Purpose**: Workflow initiation
- **Examples**: Webhook, Schedule, Email Trigger

##### Webhook Nodes
- **Interface**: `IWebhookNode`
- **Method**: `webhook()`
- **Purpose**: HTTP endpoint handling
- **Examples**: Webhook, Form Trigger

### Node Structure

#### Basic Node Template
```typescript
import { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    group: ['transform'],
    version: 1,
    description: 'Node description',
    defaults: {
      name: 'My Node',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      // Node parameters
    ],
  };

  async execute(this: IExecuteFunctions) {
    // Node logic
  }
}
```

#### Node Description Properties
- **Metadata**: displayName, name, version
- **UI**: icon, group, subtitle
- **Connections**: inputs, outputs, inputNames, outputNames
- **Parameters**: properties array
- **Credentials**: credentials array

### Parameter System

#### Parameter Types
```typescript
interface INodePropertyOptions {
  displayName: string;
  name: string;
  type: NodeParameterType;
  default: any;
  required?: boolean;
  displayOptions?: IDisplayOptions;
  options?: INodePropertyOptions[];
}
```

#### Common Parameter Types
- **string**: Text input
- **number**: Numeric input
- **boolean**: Checkbox
- **options**: Dropdown select
- **multiOptions**: Multi-select
- **collection**: Grouped parameters
- **fixedCollection**: Dynamic parameter groups
- **json**: JSON editor
- **resourceLocator**: Resource selector

#### Dynamic Parameters
- **loadOptions**: Dynamic dropdown loading
- **loadOptionsMethod**: Backend data fetching
- **typeOptions**: Parameter-specific options
- **displayOptions**: Conditional display

### Execution Context

#### Available Methods
```typescript
// Data access
this.getInputData();
this.getNodeParameter('paramName', itemIndex);

// Credentials
this.getCredentials('credentialType');

// HTTP requests
this.helpers.request(options);
this.helpers.requestWithAuthentication();

// Binary data
this.helpers.prepareBinaryData(buffer, filename);
this.helpers.getBinaryDataBuffer(itemIndex, propertyName);

// Workflow data
this.getWorkflow();
this.getNode();
this.getMode();
```

### Data Processing

#### Input/Output Handling
```typescript
// Getting input
const items = this.getInputData();

// Processing items
const returnData: INodeExecutionData[] = [];
for (let i = 0; i < items.length; i++) {
  const newItem: INodeExecutionData = {
    json: {
      // Processed data
    },
    binary: items[i].binary,
  };
  returnData.push(newItem);
}

// Returning output
return [returnData];
```

#### Error Handling
```typescript
// Node errors
throw new NodeOperationError(
  this.getNode(),
  'Error message',
  { itemIndex }
);

// API errors
throw new NodeApiError(
  this.getNode(),
  error,
  { httpCode: 400, message: 'API Error' }
);
```

### Credential System

#### Credential Definition
```typescript
export class MyApiCredentials implements ICredentialType {
  name = 'myApi';
  displayName = 'My API';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
    },
  ];
}
```

#### Using Credentials
```typescript
const credentials = await this.getCredentials('myApi');
const apiKey = credentials.apiKey as string;

// With authentication helper
const response = await this.helpers.requestWithAuthentication.call(
  this,
  'myApi',
  requestOptions
);
```

### Advanced Features

#### Binary Data Handling
- Reading binary input
- Creating binary output
- File type detection
- Stream processing

#### Pagination Support
- Implementing paginated requests
- Cursor-based pagination
- Page-based pagination
- Automatic pagination

#### Polling Triggers
- State management
- Deduplication
- Error recovery
- Polling intervals

#### Sub-node Architecture
- Creating sub-nodes
- Resource and operation pattern
- Dynamic UI generation
- Code organization

### Testing Nodes

#### Unit Testing
```typescript
describe('MyNode', () => {
  let node: MyNode;
  let executeFunctions: IExecuteFunctions;

  beforeEach(() => {
    node = new MyNode();
    executeFunctions = createMockExecuteFunctions();
  });

  it('should process data correctly', async () => {
    // Test implementation
  });
});
```

#### Integration Testing
- Testing with real APIs
- Credential mocking
- Error scenarios
- Edge cases

### Best Practices

#### Performance
- Batch API requests
- Stream large data
- Implement pagination
- Cache when appropriate

#### User Experience
- Clear parameter names
- Helpful descriptions
- Sensible defaults
- Error messages

#### Code Organization
- Separate concerns
- Reusable utilities
- Type safety
- Documentation

## Key Questions to Answer

1. How do nodes handle authentication?
2. What's the lifecycle of node execution?
3. How is binary data processed efficiently?
4. What are the patterns for error handling?
5. How do polling triggers maintain state?
6. What's the best way to structure complex nodes?
7. How can nodes be tested effectively?
8. What performance optimizations are available?

## Related Documentation

- [Node Execution Contexts](./node-execution-contexts.md) - Execution contexts
- [Workflow Execution Engine](./workflow-execution-engine.md) - How nodes are executed
- [Community Packages](./community-packages.md) - External nodes

## Code Locations to Explore

- `/packages/nodes-base/nodes/` - Built-in node examples
- `/packages/nodes-base/credentials/` - Credential types
- `/packages/workflow/src/interfaces.ts` - Node interfaces
- `/packages/core/src/node-execute-functions.ts` - Helper implementations
- Node test files for testing patterns
