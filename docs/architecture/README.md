# n8n Architecture Documentation

> **⚠️ Notice**: This document was created by AI and not properly reviewed by the team yet.

This guide provides an overview of n8n's system design, components, architectural patterns and highlights important implementation details.

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
  - Regular and Queue modes

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
