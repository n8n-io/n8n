# Dependency Injection System

> **⚠️ Notice**: This document was created by AI and not properly reviewed by the team yet.

## Overview

n8n uses TypeDI (TypeScript Dependency Injection) for managing service dependencies throughout the application. This document explains the DI patterns, service lifecycle, and best practices for using dependency injection in n8n.

## TODO: Document the Following

### TypeDI Configuration

#### Container Setup
- **Location**: `/packages/@n8n/di/src/`
- **Initialization**: Application bootstrap process
- **Global container**: Container.get() usage
- **Scoped containers**: Request-scoped services

### Service Registration

#### Service Decorators

##### @Service()
```typescript
@Service()
export class WorkflowService {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly credentialsService: CredentialsService,
  ) {}
}
```
- Auto-registration in container
- Singleton by default
- Constructor injection

##### @Service({ transient: true })
- New instance per injection
- Use cases and limitations
- Performance considerations

### Common Service Patterns

#### Repository Services
- **Pattern**: Service -> Repository -> Database
- **Example**: WorkflowService -> WorkflowRepository
- **Benefits**: Separation of concerns
- **Testing**: Easy mocking

#### Manager Services
- Complex orchestration logic
- Multiple service dependencies
- Examples: ExecutionService, CredentialsService

#### Helper Services
- Stateless utilities
- Shared functionality
- Examples: EncryptionService, CacheService

### Dependency Resolution

#### Constructor Injection
- Preferred method
- Type safety
- Circular dependency detection

#### Property Injection
```typescript
@Service()
class MyService {
  @Inject()
  private logger: Logger;
}
```
- When to use
- Limitations
- Anti-patterns

#### Manual Resolution
```typescript
const service = Container.get(WorkflowService);
```
- Use cases
- Avoiding service locator anti-pattern

### Service Lifecycle

#### Initialization
1. Container creation
2. Service registration
3. Dependency graph building
4. Singleton instantiation

#### Request Handling
- Request-scoped services
- Service state management
- Memory considerations

#### Shutdown
- Cleanup procedures
- Resource disposal
- Graceful shutdown

### Testing with DI

#### Unit Testing
```typescript
describe('WorkflowService', () => {
  let service: WorkflowService;
  let mockRepository: jest.Mocked<WorkflowRepository>;

  beforeEach(() => {
    mockRepository = createMock<WorkflowRepository>();
    service = new WorkflowService(mockRepository);
  });
});
```

#### Integration Testing
- Test container setup
- Service overrides
- Cleanup between tests

### Advanced Patterns

#### Factory Pattern
```typescript
@Service()
class ExecutorFactory {
  create(mode: WorkflowExecuteMode): IWorkflowExecutor {
    // Factory logic
  }
}
```

#### Conditional Registration
- Environment-based services
- Feature flags
- Dynamic service selection

#### Service Composition
- Aggregating services
- Facade pattern
- API boundaries

### Common Services

#### Core Services
- **WorkflowService**: Workflow CRUD operations
- **ExecutionService**: Execution management
- **CredentialsService**: Credential management
- **UserService**: User operations
- **AuthService**: Authentication logic

#### Infrastructure Services
- **CacheService**: Caching layer
- **EncryptionService**: Crypto operations
- **EventService**: Event bus
- **MetricsService**: Telemetry

### Anti-patterns to Avoid

1. **Service Locator**: Avoid Container.get() in business logic
2. **Circular Dependencies**: Refactor to break cycles
3. **God Services**: Keep services focused
4. **Stateful Singletons**: Avoid shared mutable state
5. **Property Injection Overuse**: Prefer constructor injection

### Migration Guidelines

#### Adding New Services
1. Create service class with @Service()
2. Define clear interfaces
3. Inject dependencies via constructor
4. Add unit tests
5. Register in appropriate module

#### Refactoring Existing Code
- Identify service boundaries
- Extract interfaces
- Gradual migration strategy
- Maintain backward compatibility

## Key Questions to Answer

1. How does TypeDI resolve circular dependencies?
2. When should services be transient vs singleton?
3. How are request-scoped services implemented?
4. What's the performance impact of DI?
5. How do we test services with many dependencies?
6. What patterns exist for conditional service registration?
7. How does DI work with the modular architecture?
8. What are the best practices for service interfaces?

## Related Documentation

- [System Overview](./system-overview.md) - Service architecture
- [API Architecture](./api-architecture.md) - Controller-service integration
- [Testing Guide](../testing/README.md) - Testing with DI

## Code Locations to Explore

- `/packages/@n8n/di/src/` - DI container implementation
- `/packages/cli/src/services/` - Main service implementations
- `/packages/cli/src/repositories/` - Repository layer
- `/packages/cli/src/decorators/` - Custom decorators
- Service test files for patterns
