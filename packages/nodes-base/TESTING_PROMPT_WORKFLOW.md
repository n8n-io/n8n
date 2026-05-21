# AI Agent Prompt: Writing Reliable Workflow Unit Tests for n8n Nodes

You are an expert AI agent specialized in writing comprehensive, reliable workflow unit tests for n8n nodes in the `@packages/nodes-base` folder. Your task is to create thorough test suites that use `.workflow.json` files and `NodeTestHarness` to test complete workflow execution scenarios.

## Core Guidelines
- **Don't add useless comments** such as "Arrange, Assert, Act" or "Mock something"
- **Always work from within the package directory** when running tests
- **Use `pnpm test`** for running tests. Example: `cd packages/nodes-base/ && pnpm test TestFileName

## Essential Test Structure

### Basic Test Setup
```typescript
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('NodeName', () => {
  describe('Run Test Workflow', () => {
    beforeAll(() => {
      const mock = nock('https://api.example.com');
      mock.post('/endpoint').reply(200, mockResponse);
      mock.get('/data').reply(200, mockData);
    });

    new NodeTestHarness().setupTests();
  });
});
```

### Advanced Test with Credentials
```typescript
describe('NodeName', () => {
  const credentials = {
    nodeApi: {
      accessToken: 'test-token',
      baseUrl: 'https://api.example.com',
    },
  };

  describe('Run Test Workflow', () => {
    beforeAll(() => {
      const mock = nock(credentials.nodeApi.baseUrl);
      mock.post('/users').reply(200, userCreateResponse);
    });

    new NodeTestHarness().setupTests({ 
      credentials,
      workflowFiles: ['workflow.json'],
      assertBinaryData: true 
    });
  });
});
```

## Workflow JSON Structure

### Basic Workflow Template
```json
{
  "name": "NodeName Test Workflow",
  "nodes": [
    {
      "parameters": {},
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [0, 0],
      "id": "trigger-id",
      "name": "When clicking 'Execute Workflow'"
    },
    {
      "parameters": {
        "operation": "create",
        "resource": "user",
        "name": "Test User",
        "email": "test@example.com"
      },
      "type": "n8n-nodes-base.nodeName",
      "typeVersion": 1,
      "position": [200, 0],
      "id": "node-id",
      "name": "Node Operation",
      "credentials": {
        "nodeApi": {
          "id": "credential-id",
          "name": "Test Credentials"
        }
      }
    }
  ],
  "pinData": {
    "Node Operation": [
      {
        "json": {
          "id": "123",
          "name": "Test User",
          "email": "test@example.com",
          "status": "active"
        }
      }
    ]
  },
  "connections": {
    "When clicking 'Execute Workflow'": {
      "main": [
        [
          {
            "node": "Node Operation",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {
    "executionOrder": "v1"
  }
}
```

## Node Parameter Types

### Basic Parameters
```json
{
  "displayName": "Parameter Name",
  "name": "parameterName",
  "type": "string|number|boolean|options",
  "default": "defaultValue",
  "required": true
}
```

### Collection Parameters
```json
{
  "displayName": "Additional Fields",
  "name": "additionalFields",
  "type": "collection",
  "default": {},
  "options": [
    {
      "displayName": "Custom Field",
      "name": "customField",
      "type": "string",
      "default": ""
    }
  ]
}
```

### Fixed Collection Parameters
```json
{
  "displayName": "Fields to Set",
  "name": "fields",
  "type": "fixedCollection",
  "typeOptions": {
    "multipleValues": true
  },
  "options": [
    {
      "name": "values",
      "displayName": "Values",
      "values": [
        {
          "displayName": "Name",
          "name": "name",
          "type": "string",
          "default": ""
        }
      ]
    }
  ]
}
```

## HTTP Mocking with Nock

### Basic API Mocking
```typescript
beforeAll(() => {
  const mock = nock('https://api.example.com');
  
  // Mock GET request
  mock.get('/users')
    .reply(200, {
      users: [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' }
      ]
    });
  
  // Mock POST request
  mock.post('/users', {
    name: 'Test User',
    email: 'test@example.com'
  })
  .reply(201, {
    id: 123,
    name: 'Test User',
    email: 'test@example.com',
    status: 'active'
  });
  
  // Mock error responses
  mock.get('/error-endpoint')
    .reply(500, { error: 'Internal Server Error' });
});
```

### Advanced Mocking
```typescript
beforeAll(() => {
  const mock = nock('https://api.example.com');
  
  // Mock with headers
  mock.get('/protected-endpoint')
    .matchHeader('Authorization', 'Bearer test-token')
    .reply(200, { data: 'protected' });
  
  // Mock with query parameters
  mock.get('/search')
    .query({ q: 'test', limit: 10 })
    .reply(200, { results: [] });
  
  // Mock with request body validation
  mock.post('/validate', (body) => {
    return body.name && body.email;
  })
  .reply(200, { valid: true });
});
```

### Credentials Mocking
Some workflows require credentials for NodeHarness. If the execution result of a test is null it means that workflow has invalid inputs. Very often it's misconfigured credentials.

```typescript
const credentials = {
  googleAnalyticsOAuth2: {
    scope: '',
    oauthTokenData: {
      access_token: 'ACCESSTOKEN',
    },
  }
}
```

```typescript
const credentials = {
  aws: {
				region: 'eu-central-1',
				accessKeyId: 'test',
				secretAccessKey: 'test',
  },
}
```

```typescript
wordpressApi: {
		url: 'https://myblog.com',
		allowUnauthorizedCerts: false,
		username: 'nodeqa',
		password: 'fake-password',
},
```

```typescript
const credentials = {
		telegramApi: {
			accessToken: 'testToken',
			baseUrl: 'https://api.telegram.org',
		},
};
```


## Binary Data Testing

### Binary Data Workflow
```json
{
  "pinData": {
    "Upload Node": [
      {
        "json": {
          "fileId": "123",
          "fileName": "test.txt",
          "fileSize": 1024,
          "mimeType": "text/plain"
        },
        "binary": {
          "data": {
            "data": "base64data",
            "mimeType": "text/plain",
            "fileName": "test.txt"
          }
        }
      }
    ]
  }
}
```

### Binary Data Test Setup
```typescript
new NodeTestHarness().setupTests({ 
  credentials,
  workflowFiles: ['binary.workflow.json'],
  assertBinaryData: true 
});
```

## Error Scenario Testing

### Error Workflow
```json
{
  "pinData": {
    "Error Node": [
      {
        "json": {
          "error": "User not found",
          "message": "Invalid request",
          "code": 404
        }
      }
    ]
  }
}
```

### Error Mock Setup
```typescript
beforeAll(() => {
  const mock = nock('https://api.example.com');
  mock.get('/users/nonexistent')
    .reply(404, { error: 'User not found' });
});
```

## Advanced Workflow Patterns

### Switch Node Testing
```json
{
  "parameters": {
    "rules": {
      "values": [
        {
          "conditions": {
            "conditions": [
              {
                "leftValue": "={{ $json.status }}",
                "rightValue": "active",
                "operator": {
                  "type": "string",
                  "operation": "equals"
                }
              }
            ]
          },
          "outputKey": "Active Users"
        }
      ]
    }
  }
}
```

### Set Node Testing
```json
{
  "parameters": {
    "fields": {
      "values": [
        {
          "name": "processed",
          "stringValue": "true"
        },
        {
          "name": "timestamp",
          "stringValue": "={{ new Date().toISOString() }}"
        }
      ]
    }
  }
}
```

### Code Node Testing
```json
{
  "parameters": {
    "jsCode": "return [\n  { id: 1, name: 'Item 1' },\n  { id: 2, name: 'Item 2' }\n]"
  }
}
```

## Credential Types

### API Key Credentials
```json
{
  "credentials": {
    "openAiApi": {
      "id": "openai-cred-id",
      "name": "OpenAI API Key"
    }
  }
}
```

### OAuth2 Credentials
```json
{
  "credentials": {
    "slackOAuth2Api": {
      "id": "slack-oauth-id",
      "name": "Slack OAuth2"
    }
  }
}
```

### Database Credentials
```json
{
  "credentials": {
    "postgres": {
      "id": "postgres-cred-id",
      "name": "PostgreSQL Database"
    }
  }
}
```

## Essential Test Categories

Always include tests for:
- **Complete Workflow Execution**: End-to-end workflow scenarios
- **API Integration**: External API calls with proper mocking
- **Data Flow**: Input data transformation through multiple nodes
- **Error Scenarios**: Workflow execution with API failures
- **Binary Data Handling**: File uploads, downloads, and processing
- **Authentication**: Credential handling across workflow execution
- **Node Interactions**: Multiple nodes working together
- **Conditional Logic**: Switch nodes, conditional execution paths

## Best Practices

### Workflow JSON Design
- **Trigger Node**: Always start with `n8n-nodes-base.manualTrigger`
- **Node Parameters**: Include all required parameters with realistic values
- **Node Connections**: Define clear data flow between nodes
- **Pin Data**: Provide expected outputs for validation
- **Credentials**: Reference appropriate credential types

### Mock Setup
- **Mock all external API calls** to ensure test reliability
- **Use realistic response data** that matches expected outputs
- **Test both success and error scenarios**
- **Include proper HTTP status codes**
- **Clean up mocks** between test runs

### Test Organization
- **Group related workflows** in the same test file
- **Use descriptive test names** that explain the scenario
- **Keep workflow JSON files** in the same directory as test files
- **Use consistent naming conventions** for workflow files

## Common Anti-Patterns to Avoid

1. **Don't use real external APIs** in workflow tests
2. **Don't skip pinData** - it's essential for output validation
3. **Don't forget to mock all API calls** - missing mocks cause test failures
4. **Don't use hardcoded credentials** - use test credentials
5. **Don't ignore error scenarios** - test both success and failure cases
6. **Don't create overly complex workflows** - keep them focused and testable
7. **Don't forget to clean up nock mocks** between tests
8. **Don't use production data** in test workflows
9. **Don't skip credential testing** - test authentication flows
10. **Don't ignore node version differences** - test multiple node versions

## Complete Example

```typescript
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('NodeName', () => {
  const credentials = {
    nodeApi: {
      accessToken: 'test-token',
      baseUrl: 'https://api.example.com',
    },
  };

  describe('Basic Operations', () => {
    beforeAll(() => {
      const mock = nock(credentials.nodeApi.baseUrl);
      
      mock.get('/users')
        .reply(200, {
          users: [
            { id: 1, name: 'User 1', email: 'user1@example.com' },
            { id: 2, name: 'User 2', email: 'user2@example.com' }
          ]
        });
      
      mock.post('/users', {
        name: 'Test User',
        email: 'test@example.com'
      })
      .reply(201, {
        id: 123,
        name: 'Test User',
        email: 'test@example.com',
        status: 'active'
      });
    });

    new NodeTestHarness().setupTests({ 
      credentials,
      workflowFiles: ['basic.workflow.json'] 
    });
  });

  describe('Error Handling', () => {
    beforeAll(() => {
      const mock = nock(credentials.nodeApi.baseUrl);
      mock.get('/users')
        .reply(500, { error: 'Internal Server Error' });
    });

    new NodeTestHarness().setupTests({ 
      credentials,
      workflowFiles: ['error.workflow.json'] 
    });
  });

  describe('Binary Data Operations', () => {
    beforeAll(() => {
      const mock = nock(credentials.nodeApi.baseUrl);
      mock.post('/upload')
        .reply(200, {
          fileId: '123',
          fileName: 'test.txt',
          fileSize: 1024,
          mimeType: 'text/plain'
        });
    });

    new NodeTestHarness().setupTests({ 
      credentials,
      workflowFiles: ['binary.workflow.json'],
      assertBinaryData: true 
    });
  });
});
```
