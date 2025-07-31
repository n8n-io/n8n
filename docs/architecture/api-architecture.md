# API Architecture

> **⚠️ Notice**: This documentation was created by AI and not properly reviewed by the team yet.

## Overview

n8n provides a comprehensive REST API for workflow management, execution control, and system administration. This document covers the API design patterns, controller architecture, middleware stack, and versioning strategy.

## TODO: Document the Following

### API Structure

#### RESTful Design
- Resource-based URLs
- HTTP verb semantics
- Status code conventions
- Response format standards

#### API Routes Overview
```
/api/v1/workflows          - Workflow CRUD
/api/v1/executions        - Execution management
/api/v1/credentials       - Credential operations
/api/v1/users            - User management
/api/v1/nodes            - Node information
/webhook/*               - Dynamic webhooks
/webhook-test/*          - Test webhooks
```

### Controller Architecture

#### Base Controller Pattern
```typescript
@RestController()
export abstract class BaseController {
  @Get('/')
  async getAll(req: Request): Promise<Resource[]> {}

  @Get('/:id')
  async getOne(req: Request): Promise<Resource> {}

  @Post('/')
  async create(req: Request): Promise<Resource> {}

  @Patch('/:id')
  async update(req: Request): Promise<Resource> {}

  @Delete('/:id')
  async delete(req: Request): Promise<void> {}
}
```

#### Controller Organization
- **Location**: `/packages/cli/src/controllers/`
- **Naming**: `[resource].controller.ts`
- **Decorators**: Route definition
- **Dependency injection**: Service layer

#### Common Controllers

##### WorkflowController
- Workflow CRUD operations
- Activation/deactivation
- Sharing management
- Tag operations

##### ExecutionController
- Execution listing
- Execution details
- Retry/delete operations
- Execution filtering

##### CredentialsController
- Credential CRUD
- Encryption handling
- Testing credentials
- OAuth flow support

### Middleware Stack

#### Request Pipeline
```
Request → CORS → Body Parser → Auth → Rate Limit → Route → Controller → Response
```

#### Core Middleware

##### Authentication Middleware
- JWT validation
- API key authentication
- Session management
- Public route exceptions

##### Error Handling
```typescript
export class ErrorHandler {
  handle(error: Error, req: Request, res: Response) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.details
      });
    }
    // Other error types...
  }
}
```

##### Request Validation
- Body schema validation
- Query parameter validation
- Type coercion
- Sanitization

##### Rate Limiting
- Per-user limits
- Per-IP limits
- API key specific limits
- Endpoint-specific rules

### Request/Response Format

#### Request Structure
```typescript
interface ApiRequest<T = any> {
  body: T;
  query: Record<string, string>;
  params: Record<string, string>;
  headers: Record<string, string>;
  user?: User;
}
```

#### Response Format
```typescript
// Success response
{
  "data": { /* resource data */ },
  "nextCursor": "optional-pagination-cursor"
}

// Error response
{
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "details": { /* additional context */ }
}
```

#### Pagination
- Cursor-based pagination
- Limit/offset fallback
- Default page sizes
- Max limits enforcement

### API Versioning

#### Version Strategy
- URL path versioning (`/api/v1/`)
- Breaking change policy
- Deprecation timeline
- Version negotiation

#### Backward Compatibility
- Field addition rules
- Deprecation warnings
- Migration guides
- Sunset headers

### OpenAPI/Swagger

#### API Documentation
- **Location**: `/packages/cli/src/openapi/`
- Auto-generation from decorators
- Schema definitions
- Example requests/responses

#### Swagger UI
- Interactive documentation
- Authentication setup
- Try-it-out functionality
- Schema validation

### Webhook System

#### Webhook Registration
- Dynamic path creation
- Method configuration
- Authentication options
- Response customization

#### Webhook Handling
```typescript
@RestController('/webhook')
export class WebhookController {
  async handleWebhook(
    req: WebhookRequest,
    res: Response
  ) {
    const workflow = await findWorkflowByPath(req.path);
    const execution = await executeWorkflow(workflow, req);
    return formatResponse(execution, workflow.responseMode);
  }
}
```

### API Security

#### Authentication Methods
- Bearer token (JWT)
- API key header
- Cookie-based session
- OAuth2 (for specific endpoints)

#### Authorization
- Resource-based permissions
- Scope validation
- Owner verification
- Admin overrides

#### Security Headers
```typescript
helmet({
  contentSecurityPolicy: { /* CSP rules */ },
  hsts: { maxAge: 31536000 },
  noSniff: true,
  xssFilter: true
})
```

### Performance Optimization

#### Response Caching
- ETag support
- Last-Modified headers
- Cache-Control directives
- Conditional requests

#### Query Optimization
- Field selection
- Relationship loading
- Query complexity limits
- Database query optimization

### API Testing

#### Integration Tests
```typescript
describe('WorkflowController', () => {
  it('should create workflow', async () => {
    const response = await request(app)
      .post('/api/v1/workflows')
      .send({ name: 'Test Workflow' })
      .expect(201);

    expect(response.body.data).toHaveProperty('id');
  });
});
```

#### Contract Testing
- Request/response validation
- Schema compliance
- Breaking change detection
- Mock server generation

## Key Questions to Answer

1. How is API versioning implemented?
2. What's the authentication flow for API requests?
3. How are validation errors standardized?
4. What rate limiting strategies are used?
5. How is pagination implemented efficiently?
6. What's the webhook security model?
7. How are API changes documented?
8. What monitoring is available for API health?

## Related Documentation

- [Authentication & Authorization](./authentication-authorization.md) - Auth details
- [Dependency Injection](./dependency-injection.md) - Controller DI
- [WebSocket & Real-time](./websocket-realtime.md) - Real-time APIs

## Code Locations to Explore

- `/packages/cli/src/controllers/` - All API controllers
- `/packages/cli/src/middlewares/` - Middleware implementations
- `/packages/cli/src/requests.dto.ts` - Request DTOs
- `/packages/cli/src/openapi/` - OpenAPI definitions
- `/packages/cli/src/decorators/` - Route decorators
- API test files for testing patterns
