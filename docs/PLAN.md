# Documentation Plan for n8n Architecture

> **⚠️ Notice**: This documentation was created by AI and not properly reviewed by the team yet.

## Overview
This plan prioritizes creating documentation for the most complex and non-obvious parts of n8n that would confuse new engineers. The focus is on developer experience and understanding core systems.

## Phase 1: Core Execution Architecture (Critical)

### 1. Workflow Execution Engine Documentation
**File:** `docs/architecture/workflow-execution-engine.md`
- Document data structures: `INodeExecutionData`, `IExecuteData`, `IRunExecutionData`, `IWorkflowExecuteAdditionalData`
- Execution lifecycle and state management
- Node execution stack manipulation
- Partial vs full execution flows
- Error handling and recovery

### 2. Expression System Documentation
**File:** `docs/architecture/expression-system.md`
- Expression parsing and evaluation pipeline
- Data proxy system (`$json`, `$node`, etc.)
- Security sandboxing
- Performance optimizations
- Custom functions and helpers

### 3. Node Execution Context System
**File:** `docs/architecture/node-execution-contexts.md`
- Different context types (ExecuteContext, TriggerContext, WebhookContext, etc.)
- When each context is used
- Available APIs per context
- Helper functions availability

## Phase 2: Frontend Architecture (High Priority)

### 4. Frontend State Management
**File:** `docs/architecture/frontend-state-management.md`
- Pinia store architecture and relationships
- Workflow state vs UI state separation
- Real-time updates via WebSocket
- Canvas state management
- Store dependencies and interaction patterns

### 5. Frontend Architecture Overview
**File:** `docs/architecture/frontend-architecture.md`
- Component structure and hierarchy
- Canvas/editor implementation
- Event handling and communication
- Performance considerations

## Phase 3: System Integration (Medium-High Priority)

### 6. Database Architecture
**File:** `docs/architecture/database-architecture.md`
- Entity relationships and lifecycle
- Migration patterns
- Performance considerations
- TypeORM usage patterns

### 7. Dependency Injection System
**File:** `docs/architecture/dependency-injection.md`
- Service registration and lifecycle
- Container configuration
- Testing with DI
- Common patterns and anti-patterns

### 8. Authentication & Authorization
**File:** `docs/architecture/authentication-authorization.md`
- JWT flow and session management
- RBAC implementation
- Permission system architecture
- Multi-tenant considerations

## Phase 4: Advanced Topics (Medium Priority)

### 9. WebSocket & Real-time Features
**File:** `docs/architecture/websocket-realtime.md`
- Push connection architecture
- Event types and payloads
- Collaboration features
- Performance implications

### 10. Queue Processing Architecture
**File:** `docs/architecture/queue-processing.md`
- Bull queue implementation details
- Job types and processing
- Scaling considerations
- Error handling and retries

### 11. Node Development Guide
**File:** `docs/architecture/node-development.md`
- Node lifecycle and execution
- Available APIs and helpers
- Testing nodes
- Best practices

### 12. API Architecture
**File:** `docs/architecture/api-architecture.md`
- Controller patterns
- Middleware stack
- Request/response flow
- API versioning strategy

## Implementation Strategy

1. **Start with placeholder files** containing:
   - Brief description of what needs to be documented
   - Key questions to answer
   - Code locations to examine
   - Related files and systems

2. **Prioritize by impact**:
   - Phase 1 is critical for understanding core functionality
   - Phase 2 is essential for frontend contributions
   - Phase 3 covers important integrations
   - Phase 4 addresses specialized topics

3. **Each document should include**:
   - Architecture diagrams (Mermaid)
   - Code examples with file references
   - Common patterns and anti-patterns
   - Troubleshooting guides
   - Performance considerations

4. **Cross-references**: Link related documentation to create a comprehensive knowledge base

This plan addresses the most confusing aspects of n8n for new engineers while providing a foundation for understanding the entire system.
