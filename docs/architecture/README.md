# n8n Architecture Documentation

> **⚠️ Notice**: This document was created by AI and not properly reviewed by the team yet.

Welcome to the n8n architecture documentation. This guide provides a comprehensive overview of n8n's system design, components, and architectural patterns.

## 🚀 Quick Start

If you're new to n8n's architecture, start here:

1. **[System Overview](./system-overview.md)** - High-level architecture and core components
2. **[Execution Modes](./execution-modes.md)** - Understanding deployment options (Regular vs Queue mode)
3. **[Data Flow](./data-flow.md)** - How data moves through the system
4. **[Package Architecture](./package-architecture.md)** - Code organization and dependencies

## 📚 Documentation Structure

### Core Concepts

- **[System Overview](./system-overview.md)**
  - Core architecture principles
  - System components overview
  - Deployment modes comparison
  - Service architecture patterns

- **[Execution Modes](./execution-modes.md)**
  - Main process (`n8n start`)
  - Worker process (`n8n worker`)
  - Webhook process (`n8n webhook`)
  - Choosing between Regular and Queue mode
  - Migration between modes

- **[Data Flow](./data-flow.md)**
  - Workflow execution lifecycle
  - Data transformation pipeline
  - Storage architecture
  - Expression resolution
  - Security and encryption

- **[Package Architecture](./package-architecture.md)**
  - Monorepo structure
  - Package dependencies
  - Service patterns
  - Node system architecture
  - Frontend architecture

### Backend Architecture

- **[Workflow Execution Engine](./workflow-execution-engine.md)**
  - Core execution data structures
  - Node execution orchestration
  - Execution modes and lifecycle
  - Error handling and recovery

- **[Expression System](./expression-system.md)**
  - Expression language syntax
  - Data access patterns
  - Function library
  - Performance optimizations

- **[Node Execution Contexts](./node-execution-contexts.md)**
  - Execution context types
  - Available methods per context
  - Data transformation patterns
  - Context-specific features

- **[Database Architecture](./database-architecture.md)**
  - Entity relationship model
  - Migration patterns
  - Repository layer
  - Performance optimizations

- **[Dependency Injection](./dependency-injection.md)**
  - Service container architecture
  - Injection patterns
  - Lifecycle management
  - Testing strategies

- **[Authentication & Authorization](./authentication-authorization.md)**
  - JWT token architecture
  - RBAC implementation
  - Session management
  - Security best practices

- **[WebSocket & Real-time](./websocket-realtime.md)**
  - Real-time event system
  - WebSocket implementation
  - Push notification architecture
  - Live collaboration features

- **[Queue Processing](./queue-processing.md)**
  - Job queue architecture
  - Bull/Redis integration
  - Worker pool management
  - Job recovery and retries

- **[API Architecture](./api-architecture.md)**
  - RESTful API design
  - Controller patterns
  - Middleware stack
  - OpenAPI documentation

### Frontend Architecture

- **[Frontend Architecture](./frontend-architecture.md)**
  - Vue 3 component structure
  - Canvas implementation
  - Routing patterns
  - Performance optimizations

- **[Frontend State Management](./frontend-state-management.md)**
  - Pinia store architecture
  - State synchronization
  - Optimistic updates
  - Cache management

### Development

- **[Node Development](./node-development.md)**
  - Creating custom nodes
  - Node type interfaces
  - Testing node implementations
  - Publishing guidelines

### Other Documentation

- **[Task Runner](./task-runner.md)**
  - Isolated code execution
  - Security sandboxing
  - Performance implications

- **[Event System](./event-system.md)**
  - Event bus architecture
  - Event types and handlers
  - Audit logging

- **[Community Packages](./community-packages.md)**
  - Package installation
  - Security considerations
  - Version management

- **[Caching](./caching.md)**
  - Multi-level cache strategy
  - Cache invalidation
  - Performance benefits

- **[Evaluation](./evaluation.md)**
  - Workflow testing framework
  - Performance evaluation
  - Quality metrics


## 🔑 Key Concepts

### Workflow Execution Model
n8n uses a node-based execution model where workflows are directed acyclic graphs (DAGs) of nodes. Each node:
- Receives input data from previous nodes
- Processes the data according to its type
- Outputs data for subsequent nodes

### Deployment Flexibility
n8n supports two deployment modes to accommodate different scale requirements:
- **Regular Mode**: Simple, single-process deployment ideal for small to medium workloads
- **Queue Mode**: Scalable, distributed deployment with Redis for high-volume production use

For detailed architecture, configuration, and migration guides, see [Execution Modes](./execution-modes.md).

### Multi-tenancy & Collaboration
- Projects for team organization
- Role-based access control (RBAC)
- Shared workflows and credentials
- Audit logging

### Extensibility
- Plugin architecture for custom nodes
- Webhook system for external triggers
- Community nodes support
- REST API for programmatic access

## 🏗️ Architecture Principles

1. **Modularity**: Clear separation of concerns through packages
2. **Scalability**: Horizontal scaling through queue mode
3. **Security**: Encryption at rest, JWT authentication, RBAC
4. **Extensibility**: Plugin system and community nodes
5. **Performance**: Caching, streaming, and efficient data handling

## 🔧 For Contributors

### Adding New Services
1. Create service class with `@Service()` decorator
2. Inject dependencies via constructor
3. Register in dependency injection container
4. Add corresponding controller if needed

### Database Changes
1. Create migration in appropriate database folder
2. Use provided migration helpers
3. Test on all supported databases
4. Update entities and repositories

### Adding New Nodes
1. Create node in `packages/nodes-base/nodes/`
2. Implement `INodeType` interface
3. Add credentials if needed
4. Include tests and documentation

## 📊 Performance Considerations

- **Memory Management**: Stream large files, batch operations
- **Execution Optimization**: Expression caching, parallel execution
- **Database Efficiency**: Proper indexing, execution pruning
- **Caching Strategy**: Multi-level caching (memory, Redis, database)

## 🔒 Security Architecture

For comprehensive security details, see [System Overview - Security](./system-overview.md#security-architecture):
- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Project-based RBAC via `@n8n/permissions`
- **Encryption**: AES-256-GCM for credentials, TLS for transport
- **Audit**: Comprehensive event logging via event system

## 🚧 Troubleshooting

### Common Architecture Questions

**Q: When should I use Queue mode?**
A: Use Queue mode when you need high availability, horizontal scaling, or have high workflow volumes. See [Execution Modes](./execution-modes.md) for detailed criteria.

**Q: How does n8n handle large files?**
A: Binary data is stored separately (filesystem/S3) with references in the database. See [Data Flow](./data-flow.md) for details.

**Q: Can I run multiple main processes?**
A: Yes, in Queue mode you can run multiple main processes behind a load balancer. See [Queue Mode Architecture](./execution-modes.md#queue-mode-architecture).

**Q: How are credentials secured?**
A: Credentials are encrypted with AES-256-GCM. See [Security Architecture](./system-overview.md#security-architecture) for details.

## 📈 Monitoring & Observability

See [System Overview - Monitoring](./system-overview.md#monitoring--observability) for monitoring architecture and health check endpoints.

