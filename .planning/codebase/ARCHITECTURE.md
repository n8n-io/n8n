# Architecture

**Analysis Date:** 2026-04-01

## Pattern Overview

**Overall:** Layered monorepo with clear separation between backend API layer (Node.js/Express), core execution engine (workflow runtime), and frontend UI layer (Vue 3). The system uses dependency injection (DI container), event-driven messaging, and context-based execution contexts for different node types.

**Key Characteristics:**
- Distributed monorepo using pnpm workspaces and Turbo build orchestration
- Dependency injection via `@n8n/di` container for service management
- Event-driven architecture with message bus for inter-service communication
- Context-based execution with multiple execution context types (trigger, normal, webhook)
- Plugin architecture for extensible nodes and credentials
- TypeORM repository pattern for database abstraction

## Layers

**API & HTTP Layer:**
- Purpose: Express.js REST API endpoints and controller routing
- Location: `packages/cli/src/controllers/` and `packages/cli/src/server.ts`
- Contains: Controllers, middleware, authentication, authorization
- Depends on: Services, database repositories, execution engine
- Used by: Frontend UI, public API consumers

**Service Layer:**
- Purpose: Business logic orchestration, workflow/execution management, credential handling
- Location: `packages/cli/src/workflows/`, `packages/cli/src/executions/`, `packages/cli/src/credentials/`, `packages/cli/src/modules/`
- Contains: Service classes (`*.service.ts`), helpers (`*.service.ts`), domain logic
- Depends on: Repositories, execution engine, configuration
- Used by: Controllers, other services, event bus handlers

**Execution Engine:**
- Purpose: Workflow execution runtime, node execution context, workflow traversal
- Location: `packages/core/src/execution-engine/` and `packages/workflow/src/`
- Contains: Workflow executor (`workflow-execute.ts`), node execution context, routing logic, expression evaluation
- Depends on: Node loader, credentials service, binary data service
- Used by: WorkflowExecutionService, manual execution service

**Repository & Data Access Layer:**
- Purpose: Database persistence, TypeORM entity management
- Location: `packages/@n8n/db/src/entities/` and `packages/@n8n/db/src/repositories/`
- Contains: TypeORM entities, repository classes with query methods
- Depends on: TypeORM configuration, database connection
- Used by: Services (never directly from controllers)

**Core Domain Layer:**
- Purpose: Shared interfaces, types, constants for workflow definitions
- Location: `packages/workflow/src/interfaces.ts`, `packages/@n8n/api-types/src/`
- Contains: Workflow interfaces, execution types, node definitions, credential types
- Depends on: None (foundation layer)
- Used by: All other layers

**Frontend State Management:**
- Purpose: Client-side state using Pinia stores
- Location: `packages/frontend/editor-ui/src/app/stores/`
- Contains: Pinia stores for workflows, UI state, settings, authentication
- Depends on: API client, Vue Router, composables
- Used by: Vue components

**Frontend Components:**
- Purpose: Vue 3 reusable UI components
- Location: `packages/frontend/editor-ui/src/app/components/` and `packages/@n8n/design-system/`
- Contains: Vue components, layouts, modals, command bar
- Depends on: Stores, composables, CSS variables
- Used by: Views and layouts

## Data Flow

**Workflow Execution Flow:**

1. User submits workflow execution via API endpoint → `WorkflowsController.executeWorkflow()` → `WorkflowExecutionService.startWorkflowExecution()`
2. Service fetches workflow entity from database → constructs execution context
3. Passes to execution engine (`WorkflowExecute` class in `packages/core/src/execution-engine/workflow-execute.ts`)
4. Engine traverses workflow nodes using `workflow.connections` (indexed by source node)
5. For each node: creates `NodeExecutionContext`, loads node implementation from `NodesLoader`
6. Node executes with credentials resolved from `CredentialsService`, binary data handled by `BinaryDataService`
7. Results stored in `ExecutionData` entity via repository
8. Execution completed → event published to `MessageEventBus` → subscribers notified (e.g., Push notifications)

**Frontend State Synchronization:**

1. Vue component mounts → uses store getter/action → calls API via `APIClient`
2. API returns data → store updates state (Pinia)
3. Component re-renders from store subscription
4. Push connection (WebSocket) receives real-time updates → store mutations triggered
5. UI syncs via `usePushConnection` composable

**Webhook Trigger Flow:**

1. Incoming webhook HTTP POST → `WebhooksController` routes to webhook endpoint
2. Matches webhook UUID to workflow trigger node
3. Creates execution context with `WorkflowExecuteMode.Trigger`
4. Engine executes from trigger node onwards through connected nodes
5. Results persisted as execution record

## Key Abstractions

**Workflow Definition:**
- Purpose: Represents the graph structure of nodes and connections
- Examples: `packages/workflow/src/interfaces.ts` (IWorkflow, INode, IConnections)
- Pattern: Plain data objects serialized as JSON, immutable interface definition

**Execution Context:**
- Purpose: Runtime state container for workflow execution, provides node access to $node, $input data
- Examples: `packages/core/src/execution-engine/execution-context.ts`, `packages/core/src/execution-engine/node-execution-context/`
- Pattern: Class-based context with hooks, manages scope and expression evaluation environment

**Node Implementation:**
- Purpose: Pluggable operation logic for specific integration/function
- Examples: `packages/nodes-base/nodes/*/` (300+ node implementations)
- Pattern: Classes extending `INodeType` interface, methods for execute(), description(), credentials()

**Credential Storage:**
- Purpose: Encrypted credential data with loading strategy
- Examples: `packages/cli/src/credentials/` (CredentialsService, CredentialsHelper)
- Pattern: TypeORM entity with encryption/decryption, lazy loading from database or external vaults

**Service Locator:**
- Purpose: Dependency injection container for service resolution
- Examples: `Container` from `@n8n/di` package
- Pattern: Singleton-based DI, services registered as `@Service()` decorated classes

## Entry Points

**Backend Server:**
- Location: `packages/cli/src/server.ts`
- Triggers: Application startup via `pnpm start`
- Responsibilities: Express app initialization, controller registration, middleware setup, frontend asset serving

**Frontend App:**
- Location: `packages/frontend/editor-ui/src/app/App.vue`
- Triggers: Browser page load
- Responsibilities: Layout composition, telemetry initialization, theme setup, router configuration

**CLI Commands:**
- Location: `packages/cli/src/commands/`
- Triggers: `n8n command-name` CLI invocation
- Responsibilities: Database migration, node installation, workflow import/export, credential management

**Workflow Execution:**
- Location: `packages/cli/src/workflows/workflow-execution.service.ts`
- Triggers: API endpoint, webhook, scheduled trigger, manual execution
- Responsibilities: Workflow lookup, execution context creation, engine invocation, result persistence

## Error Handling

**Strategy:** Layered error handling with custom error classes, classification, and serialization. Errors propagate from execution engine → services → controllers → HTTP response.

**Patterns:**

**Execution Errors:**
- Location: `packages/core/src/errors/` (workflow-crashed, node-crashed errors)
- Handled in: `WorkflowExecute.executeNode()` catches errors, wraps in execution result
- Serialized: Error message, stack trace, node context included in `ExecutionError` interface

**Domain-Specific Errors:**
- Location: `packages/cli/src/errors/` (credential-not-found, workflow-missing-id, invalid-role)
- Thrown by: Services when preconditions fail
- Caught by: Controllers, converted to HTTP error responses via `@n8n/backend-common`

**HTTP Error Classification:**
- File: `packages/cli/src/errors/http-error-classifier.ts`
- Maps application errors to HTTP status codes (400, 403, 404, 409, 500)
- Used by: Global error middleware in `AbstractServer`

**Validation Errors:**
- Location: Response errors in `packages/cli/src/errors/response-errors/`
- Pattern: Field-level validation with detailed error messages
- Used by: Controllers validating request DTOs

## Cross-Cutting Concerns

**Logging:** 
- Framework: Node.js built-in `console` + Winston logger abstraction
- Approach: Service-level logging at key execution points, execution event logs stored in database
- Reference: `packages/cli/src/eventbus/message-event-bus/` for event logging

**Validation:**
- Framework: TypeORM entity validators, Zod schemas for complex validation
- Approach: Input validation at controller level, business logic validation in services
- Reference: `packages/cli/src/modules/` contains validation schemas per domain

**Authentication:**
- Framework: JWT tokens + session cookies, OAuth 2.0 for node credentials
- Approach: Middleware-based route protection via decorators, role-based access control
- Reference: `packages/cli/src/auth/`, `packages/cli/src/controllers/auth.controller.ts`

**Authorization (RBAC):**
- Framework: Role-based access control with permissions system
- Approach: Decorators on controller methods (`@RequireGlobalRole()`, `@RequireResourcePermission()`)
- Reference: `packages/@n8n/permissions/` defines roles and scopes

**Event Bus:**
- Framework: Custom message event bus with pub/sub pattern
- Approach: Services publish events (execution completed, workflow activated), subscribers handle async processing
- Reference: `packages/cli/src/eventbus/message-event-bus/message-event-bus.ts`

**State Management (Frontend):**
- Framework: Pinia store with getters, mutations, actions
- Pattern: Separate stores per domain (workflows, ui, settings, rbac)
- Reference: `packages/frontend/editor-ui/src/app/stores/*.store.ts`

**Real-time Updates:**
- Framework: WebSocket via Socket.io-like Push connection
- Approach: Push connection broadcasts execution updates, node logs, workflow changes
- Reference: `packages/cli/src/push.ts`, `packages/frontend/editor-ui/src/app/composables/usePushConnection/`

---

*Architecture analysis: 2026-04-01*
