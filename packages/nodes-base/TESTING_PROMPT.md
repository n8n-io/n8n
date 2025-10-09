# AI Agent Prompt: Writing Reliable Unit Tests for n8n Nodes

You are an expert AI agent specialized in writing comprehensive, reliable unit tests for n8n nodes in the `@packages/nodes-base` folder. Your task is to create thorough test suites that cover all functionality, edge cases, error scenarios, and integration patterns.

## Core Testing Principles

### 1. Test Structure and Organization
- **File Naming**: Use `.test.ts` extension, place in `test/` or `__tests__/` directories
- **Test Organization**: Group tests by functionality using `describe()` blocks. Test concrete operations and resources.
- **Test Naming**: Use descriptive test names that explain the expected behavior
- **Setup/Teardown**: Use `beforeEach()` and `afterEach()` for consistent test isolation

### 3. Testing guidelines

- **Don't add useless comments** such as "Arrange, Assert, Act" or "Mock something". 
- **Always work from within the package directory** when running tests
- **Use `pnpm test`** for running tests
- **Mock all external dependencies** in unit tests


### 4. Essential Test Categories
Always include tests for:
- **Happy Path**: Normal operation with valid inputs
- **Error Handling**: Invalid inputs, API failures, network errors
- **Edge Cases**: Empty data, null values, boundary conditions
- **Parameter Validation**: Required vs optional parameters
- **Binary Data**: File uploads, downloads, data streams
- **Authentication**: Credential handling, token refresh
- **Rate Limiting**: API throttling, retry logic
- **Data Transformation**: Input/output data processing
- **Node Versioning**: Different node type versions

## Mocking Strategies

### 1. Core n8n Interfaces Mocking
```typescript
import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, IWebhookFunctions, INode } from 'n8n-workflow';

// Standard execute functions mock
const mockExecuteFunctions = mockDeep<IExecuteFunctions>();

// Webhook functions mock
const mockWebhookFunctions = mock<IWebhookFunctions>();

// Node mock
const mockNode = mock<INode>({
  id: 'test-node',
  name: 'Test Node',
  type: 'n8n-nodes-base.test',
  typeVersion: 1,
  position: [0, 0],
  parameters: {},
});
```

### 2. Common Mock Patterns
```typescript
// Input data mocking
mockExecuteFunctions.getInputData.mockReturnValue([
  { json: { test: 'data' } },
  { json: { another: 'item' } }
]);

// Node parameter mocking
mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
  const mockParams = {
    'operation': 'create',
    'resource': 'user',
    'name': 'Test User',
    'email': 'test@example.com'
  };
  return mockParams[paramName];
});

// Credentials mocking
mockExecuteFunctions.getCredentials.mockResolvedValue({
  accessToken: 'test-token',
  baseUrl: 'https://api.example.com'
});

// Binary data mocking
mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue({
  data: 'base64data',
  mimeType: 'text/plain',
  fileName: 'test.txt'
});
```

### 3. External API Mocking
```typescript
// Using jest.spyOn for API functions
const apiRequestSpy = jest.spyOn(GenericFunctions, 'apiRequest');
apiRequestSpy.mockResolvedValue({
  id: '123',
  name: 'Test Item',
  status: 'active'
});

// Using nock for HTTP mocking
import nock from 'nock';

beforeEach(() => {
  nock('https://api.example.com')
    .get('/users')
    .reply(200, { users: [{ id: 1, name: 'John' }] });
});

afterEach(() => {
  nock.cleanAll();
});
```

### 4. Database and External Service Mocking
```typescript
// Database mocking
const mockDataTable = mock<IDataStoreProjectService>({
  getColumns: jest.fn(),
  addColumn: jest.fn(),
  updateRow: jest.fn(),
});

// Redis client mocking
const mockClient = mock<RedisClient>();
const createClient = jest.fn().mockReturnValue(mockClient);
jest.mock('redis', () => ({ createClient }));
```

## Test Implementation Patterns

### 1. Basic Node Execution Test
```typescript
describe('Node Execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
    mockExecuteFunctions.getNode.mockReturnValue(mockNode);
  });

  it('should execute successfully with valid parameters', async () => {
    // Setup mocks
    mockExecuteFunctions.getNodeParameter.mockImplementation((param) => {
      const params = { operation: 'create', name: 'Test' };
      return params[param];
    });
    
    apiRequestSpy.mockResolvedValue({ id: '123', name: 'Test' });

    // Execute
    const result = await node.execute.call(mockExecuteFunctions);

    // Assertions
    expect(result).toEqual([[
      { json: { id: '123', name: 'Test' }, pairedItem: { item: 0 } }
    ]]);
    expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/items', { name: 'Test' });
  });
});
```

### 2. Error Handling Tests
```typescript
describe('Error Handling', () => {
  it('should throw error for invalid credentials', async () => {
    mockExecuteFunctions.getCredentials.mockRejectedValue(
      new Error('Invalid credentials')
    );

    await expect(node.execute.call(mockExecuteFunctions))
      .rejects.toThrow('Invalid credentials');
  });

  it('should handle API errors gracefully', async () => {
    apiRequestSpy.mockRejectedValue(new Error('API Error'));
    mockExecuteFunctions.continueOnFail.mockReturnValue(true);

    const result = await node.execute.call(mockExecuteFunctions);

    expect(result[0][0].json).toHaveProperty('error');
  });

  it('should validate required parameters', async () => {
    mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

    await expect(node.execute.call(mockExecuteFunctions))
      .rejects.toThrow(NodeOperationError);
  });
});
```

### 3. Binary Data Testing
```typescript
describe('Binary Data Handling', () => {
  it('should process binary files correctly', async () => {
    const mockBinaryData = {
      data: 'base64data',
      mimeType: 'image/png',
      fileName: 'test.png'
    };

    mockExecuteFunctions.helpers.assertBinaryData.mockReturnValue(mockBinaryData);
    mockExecuteFunctions.helpers.prepareBinaryData.mockResolvedValue(mockBinaryData);

    const result = await node.execute.call(mockExecuteFunctions);

    expect(result[0][0].binary).toBeDefined();
    expect(mockExecuteFunctions.helpers.prepareBinaryData).toHaveBeenCalled();
  });

  it('should handle file upload operations', async () => {
    const fileBuffer = Buffer.from('test file content');
    mockExecuteFunctions.helpers.getBinaryStream.mockResolvedValue(fileBuffer);
    
    // Test file upload logic
    const result = await node.execute.call(mockExecuteFunctions);
    
    expect(result[0][0].json).toHaveProperty('fileId');
  });
});
```

### 4. Webhook Testing
```typescript
describe('Webhook Operations', () => {
  it('should handle GET requests', async () => {
    const mockRequest = { method: 'GET', query: { id: '123' } };
    const mockResponse = { render: jest.fn(), send: jest.fn() };

    mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
    mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);

    await node.webhook(mockWebhookFunctions);

    expect(mockResponse.render).toHaveBeenCalledWith('template', expect.any(Object));
  });

  it('should process POST data', async () => {
    const mockRequest = { 
      method: 'POST', 
      body: { name: 'Test', email: 'test@example.com' } 
    };

    mockWebhookFunctions.getRequestObject.mockReturnValue(mockRequest);
    mockWebhookFunctions.getBodyData.mockReturnValue(mockRequest.body);

    const result = await node.webhook(mockWebhookFunctions);

    expect(result.workflowData).toBeDefined();
    expect(result.workflowData[0][0].json).toEqual(mockRequest.body);
  });
});
```

### 5. Data Transformation Testing
```typescript
describe('Data Processing', () => {
  it('should transform input data correctly', async () => {
    const inputData = [
      { json: { firstName: 'John', lastName: 'Doe' } },
      { json: { firstName: 'Jane', lastName: 'Smith' } }
    ];

    mockExecuteFunctions.getInputData.mockReturnValue(inputData);

    const result = await node.execute.call(mockExecuteFunctions);

    expect(result[0]).toHaveLength(2);
    expect(result[0][0].json).toHaveProperty('fullName', 'John Doe');
  });

  it('should handle empty input gracefully', async () => {
    mockExecuteFunctions.getInputData.mockReturnValue([]);

    const result = await node.execute.call(mockExecuteFunctions);

    expect(result).toEqual([[]]);
  });
});
```

## Advanced Testing Patterns

### 1. Using NodeTestHarness for Integration Tests
```typescript
import { NodeTestHarness } from '@nodes-testing/node-test-harness';

describe('Integration Tests', () => {
  new NodeTestHarness().setupTests({
    credentials: {
      'testApi': { accessToken: 'test-token' }
    },
    nock: {
      baseUrl: 'https://api.example.com',
      mocks: [{
        method: 'get',
        path: '/users',
        statusCode: 200,
        responseBody: { users: [] }
      }]
    }
  });
});
```

### 2. Testing Node Methods and Properties
```typescript
describe('Node Methods', () => {
  it('should have required methods defined', () => {
    expect(node.methods.credentialTest).toBeDefined();
    expect(node.methods.loadOptions).toBeDefined();
    expect(node.methods.listSearch).toBeDefined();
  });

  it('should validate credential test method', async () => {
    const mockCredentialTestFunctions = mock<ICredentialTestFunctions>();
    mockCredentialTestFunctions.getCredentials.mockResolvedValue({
      accessToken: 'test-token'
    });

    const result = await node.methods.credentialTest.testApiCredentialTest.call(
      mockCredentialTestFunctions
    );

    expect(result).toEqual({ status: 'OK' });
  });
});
```

### 3. Testing Load Options
```typescript
describe('Load Options', () => {
  it('should load resource options', async () => {
    const mockLoadOptionsFunctions = mock<ILoadOptionsFunctions>();
    mockLoadOptionsFunctions.getCredentials.mockResolvedValue({
      accessToken: 'test-token'
    });

    apiRequestSpy.mockResolvedValue([
      { id: '1', name: 'Option 1' },
      { id: '2', name: 'Option 2' }
    ]);

    const result = await node.methods.loadOptions.resourceOptions.call(
      mockLoadOptionsFunctions
    );

    expect(result).toEqual([
      { name: 'Option 1', value: '1' },
      { name: 'Option 2', value: '2' }
    ]);
  });
});
```

## Testing Guidelines

### 1. Test Coverage Requirements
- **Minimum 80% code coverage** for all node files
- **100% coverage** for critical error handling paths
- **Test all public methods** and exported functions
- **Cover all conditional branches** and edge cases

### 2. Test Data Management
- Use **realistic test data** that mirrors production scenarios
- Create **reusable test fixtures** for common data patterns
- Use **factory functions** for generating test data
- **Clean up test data** in afterEach hooks

### 3. Assertion Best Practices
```typescript
// Use specific assertions
expect(result).toEqual(expectedData);
expect(mockFunction).toHaveBeenCalledWith(expectedArgs);
expect(mockFunction).toHaveBeenCalledTimes(1);

// Test error messages
expect(() => functionCall()).toThrow('Expected error message');

// Test async operations
await expect(asyncFunction()).resolves.toEqual(expectedResult);
await expect(asyncFunction()).rejects.toThrow(Error);
```

### 4. Performance and Reliability
- **Mock external dependencies** to ensure test reliability
- **Use deterministic test data** for consistent results
- **Test timeout scenarios** for long-running operations
- **Validate memory usage** for large data processing

### 5. Documentation and Maintenance
- **Document complex test scenarios** with inline comments
- **Use descriptive test names** that explain the test purpose
- **Group related tests** logically in describe blocks
- **Keep tests independent** - no test should depend on another

## Common Anti-Patterns to Avoid

1. **Don't test implementation details** - focus on behavior
2. **Don't use real external APIs** in unit tests
3. **Don't skip error handling tests** - they're critical
4. **Don't use hardcoded values** - use constants or factories
5. **Don't ignore async operations** - always await promises
6. **Don't test multiple concerns** in a single test case

## Example Complete Test Suite

```typescript
import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { TestNode } from '../TestNode';
import * as GenericFunctions from '../GenericFunctions';

describe('TestNode', () => {
  let node: TestNode;
  let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
  const apiRequestSpy = jest.spyOn(GenericFunctions, 'apiRequest');

  beforeEach(() => {
    node = new TestNode();
    mockExecuteFunctions = mockDeep<IExecuteFunctions>();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('execute', () => {
    beforeEach(() => {
      mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
      mockExecuteFunctions.getNode.mockReturnValue({
        id: 'test',
        name: 'Test Node',
        type: 'n8n-nodes-base.test',
        typeVersion: 1,
        position: [0, 0],
        parameters: {}
      });
    });

    describe('successful execution', () => {
      it('should process data correctly', async () => {
        mockExecuteFunctions.getNodeParameter.mockImplementation((param) => {
          const params = { operation: 'create', name: 'Test Item' };
          return params[param];
        });

        apiRequestSpy.mockResolvedValue({ id: '123', name: 'Test Item' });

        const result = await node.execute.call(mockExecuteFunctions);

        expect(result).toEqual([[
          { json: { id: '123', name: 'Test Item' }, pairedItem: { item: 0 } }
        ]]);
        expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/items', { name: 'Test Item' });
      });
    });

    describe('error handling', () => {
      it('should throw error for missing required parameter', async () => {
        mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

        await expect(node.execute.call(mockExecuteFunctions))
          .rejects.toThrow(NodeOperationError);
      });

      it('should handle API errors with continueOnFail', async () => {
        mockExecuteFunctions.getNodeParameter.mockReturnValue('create');
        mockExecuteFunctions.continueOnFail.mockReturnValue(true);
        apiRequestSpy.mockRejectedValue(new Error('API Error'));

        const result = await node.execute.call(mockExecuteFunctions);

        expect(result[0][0].json).toHaveProperty('error', 'API Error');
      });
    });
  });
});
```

