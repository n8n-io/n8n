# n8n Package Architecture

This document provides a detailed overview of n8n's package structure, dependencies, and architectural patterns used across the codebase.

## Package Overview

n8n follows a monorepo structure using pnpm workspaces. Packages are organized into functional groups:

```
n8n/
├── packages/
│   ├── cli/                        # Main server and CLI commands
│   ├── core/                       # Core execution engine
│   ├── workflow/                   # Workflow logic and expressions
│   ├── nodes-base/                 # Built-in nodes
│   ├── node-dev/                   # Node development tools
│   └── @n8n/                       # Scoped packages
│       ├── ai-workflow-builder/    # AI-powered workflow generation
│       ├── api-types/              # Shared API type definitions
│       ├── backend-common/         # Common backend utilities
│       ├── backend-test-utils/     # Backend testing utilities
│       ├── benchmark/              # Performance benchmarking tools
│       ├── client-oauth2/          # OAuth2 client implementation
│       ├── codemirror-lang/        # CodeMirror n8n expression language
│       ├── config/                 # Configuration management
│       ├── constants/              # Shared constants
│       ├── db/                     # Database abstraction layer
│       ├── decorators/             # TypeScript decorators
│       ├── di/                     # Dependency injection container
│       ├── eslint-config/          # ESLint configuration
│       ├── extension-sdk/          # SDK for building extensions
│       ├── imap/                   # IMAP email handling
│       ├── json-schema-to-zod/     # JSON Schema to Zod converter
│       ├── nodes-langchain/        # LangChain integration nodes
│       ├── permissions/            # RBAC permissions system
│       ├── storybook/              # Storybook configuration
│       ├── task-runner/            # Task execution runtime
│       ├── typescript-config/      # TypeScript configuration
│       ├── utils/                  # Shared utilities
│       └── vitest-config/          # Vitest testing configuration
├── packages/frontend/
│   ├── editor-ui/                  # Main Vue.js application
│   └── @n8n/
│       ├── chat/                   # Chat UI component
│       ├── composables/            # Vue composables
│       ├── design-system/          # UI component library
│       ├── i18n/                   # Internationalization
│       ├── rest-api-client/        # Frontend API client
│       └── stores/                 # Pinia state management
└── packages/extensions/
    └── insights/                   # Analytics and insights extension
```

## Dependency Matrix

### Core Dependencies

```mermaid
graph TD
    subgraph "Application Layer"
        CLI[cli]
        EDITOR[editor-ui]
    end
    
    subgraph "Business Logic Layer"
        CORE[core]
        WF[workflow]
        NODES[nodes-base]
    end
    
    subgraph "Infrastructure Layer"
        DB[@n8n/db]
        DI[@n8n/di]
        CONFIG[@n8n/config]
        CONST[@n8n/constants]
        PERM[@n8n/permissions]
    end
    
    CLI --> CORE
    CLI --> WF
    CLI --> NODES
    CLI --> DB
    CLI --> DI
    CLI --> CONFIG
    
    CORE --> WF
    CORE --> DI
    CORE --> CONFIG
    
    NODES --> CORE
    NODES --> WF
    
    EDITOR --> WF
    EDITOR --> CONST
    
    DB --> DI
    PERM --> DI
```

### Detailed Package Dependencies

| Package | Direct Dependencies | Used By | Purpose |
|---------|-------------------|---------|----------|
| `workflow` | `lodash`, `luxon` | `cli`, `core`, `nodes-base`, `editor-ui` | Workflow data structures, expressions |
| `core` | `workflow`, `axios` | `cli`, `nodes-base` | Execution engine, node functions |
| `cli` | `core`, `workflow`, `db`, `nodes-base` | - | Main application server |
| `nodes-base` | `core`, `workflow` | `cli` | Built-in node implementations |
| `@n8n/db` | `typeorm`, `@n8n/di` | `cli` | Database entities and repositories |
| `@n8n/di` | `reflect-metadata` | Most packages | Dependency injection container |
| `editor-ui` | `vue`, `pinia`, `workflow` | - | Frontend application |

## Package Architecture Patterns

### 1. CLI Package (`packages/cli`)

The CLI package serves as the main application entry point and orchestrator.

```mermaid
graph TD
    subgraph "CLI Package Structure"
        CMD[Commands]
        CTRL[Controllers]
        SVC[Services]
        REPO[Repositories via @n8n/db]
        MW[Middleware]
        
        CMD --> SVC
        CTRL --> SVC
        SVC --> REPO
        MW --> SVC
    end
    
    subgraph "Key Components"
        CMD --> START[start.ts]
        CMD --> WORKER[worker.ts]
        CMD --> WEBHOOK[webhook.ts]
        
        CTRL --> WFC[WorkflowController]
        CTRL --> EC[ExecutionController]
        CTRL --> CC[CredentialsController]
        
        SVC --> WFS[WorkflowService]
        SVC --> ES[ExecutionService]
        SVC --> AS[AuthService]
    end
```

**Key Services:**
- `WorkflowService`: Workflow CRUD and management
- `ExecutionService`: Execution lifecycle management
- `CredentialsService`: Credential encryption and access
- `ProjectService`: Multi-user collaboration
- `CommunityPackagesService`: External node management

### 2. Core Package (`packages/core`)

The core package contains the execution engine and node interfaces.

```mermaid
graph LR
    subgraph "Core Package Components"
        WE[WorkflowExecute]
        NEF[NodeExecuteFunctions]
        CH[CredentialsHelper]
        BDM[BinaryDataManager]
        
        WE --> NEF
        NEF --> CH
        NEF --> BDM
    end
    
    subgraph "Node Execution"
        NEF --> HTTP[HTTP Requests]
        NEF --> FILE[File Operations]
        NEF --> CRED[Credential Access]
    end
```

**Core Responsibilities:**
- Workflow execution orchestration
- Node execution context
- Binary data management
- Credential decryption
- Expression evaluation hooks

### 3. Workflow Package (`packages/workflow`)

The workflow package defines data structures and business logic.

```mermaid
classDiagram
    class Workflow {
        +id: string
        +name: string
        +nodes: INode[]
        +connections: IConnections
        +active: boolean
        +execute()
        +getNode()
        +renameNode()
    }
    
    class Expression {
        +evaluate()
        +getParameterValue()
        +resolveSimpleExpression()
    }
    
    class WorkflowDataProxy {
        +$json
        +$node
        +$workflow
        +$execution
        +getNodeParameter()
    }
    
    Workflow --> Expression
    Expression --> WorkflowDataProxy
```

### 4. Database Package (`packages/@n8n/db`)

Database abstraction using TypeORM with repository pattern.

```mermaid
graph TD
    subgraph "Entity Layer"
        WE[WorkflowEntity]
        EE[ExecutionEntity]
        CE[CredentialsEntity]
        UE[UserEntity]
    end
    
    subgraph "Repository Layer"
        WR[WorkflowRepository]
        ER[ExecutionRepository]
        CR[CredentialsRepository]
        UR[UserRepository]
    end
    
    subgraph "Database Support"
        PG[PostgreSQL]
        MYSQL[MySQL]
        SQLITE[SQLite]
    end
    
    WE --> WR
    EE --> ER
    CE --> CR
    UE --> UR
    
    WR --> PG
    WR --> MYSQL
    WR --> SQLITE
```

### 5. Frontend Architecture (`packages/editor-ui`)

Vue 3 application with Pinia state management.

```mermaid
graph TD
    subgraph "Frontend Architecture"
        VUE[Vue Application]
        STORES[Pinia Stores]
        API[API Client]
        COMP[Components]
        VIEWS[Views]
    end
    
    subgraph "State Management"
        WS[WorkflowStore]
        US[UserStore]
        NS[NodeTypesStore]
        ES[ExecutionsStore]
    end
    
    subgraph "UI Libraries"
        DS[Design System]
        ICONS[Icons]
        MONACO[Monaco Editor]
    end
    
    VUE --> STORES
    VUE --> VIEWS
    VIEWS --> COMP
    STORES --> API
    
    STORES --> WS
    STORES --> US
    STORES --> NS
    STORES --> ES
    
    COMP --> DS
```

## Service Layer Architecture

### Service Registration

Services use dependency injection for loose coupling:

```typescript
// Service definition
@Service()
export class WorkflowService {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly credentialsService: CredentialsService,
    private readonly nodeTypes: NodeTypes,
  ) {}
}

// Usage
const workflowService = Container.get(WorkflowService);
```

### Common Service Patterns

```mermaid
graph LR
    subgraph "Service Pattern"
        CTRL[Controller] --> SVC[Service]
        SVC --> REPO[Repository]
        SVC --> EVENT[EventBus]
        SVC --> CACHE[Cache]
    end
    
    subgraph "Cross-Cutting"
        AUTH[Authorization]
        LOG[Logging]
        METRIC[Metrics]
    end
    
    CTRL -.-> AUTH
    SVC -.-> LOG
    SVC -.-> METRIC
```

## Node System Architecture

### Node Package Structure

```
nodes-base/
├── nodes/
│   ├── [NodeName]/
│   │   ├── [NodeName].node.ts       # Node implementation
│   │   ├── [NodeName].node.json     # Node metadata
│   │   ├── [NodeName]Trigger.node.ts # Trigger variant
│   │   └── descriptions/            # Parameter descriptions
│   └── ...
├── credentials/
│   ├── [ServiceName]Api.credentials.ts
│   └── ...
└── utils/
    └── utilities.ts                  # Shared utilities
```

### Node Interface

```typescript
interface INodeType {
  description: INodeTypeDescription;
  execute?(context: IExecuteFunctions): Promise<INodeExecutionData[][]>;
  trigger?(context: ITriggerFunctions): Promise<ITriggerResponse>;
  webhook?(context: IWebhookFunctions): Promise<IWebhookResponseData>;
}
```

## Configuration Architecture

### Configuration Layers

```mermaid
graph TD
    subgraph "Configuration Sources"
        DEFAULT[Default Config]
        ENV[Environment Variables]
        FILE[Config Files]
        DB[Database Settings]
    end
    
    subgraph "Config Package"
        SCHEMA[Config Schema]
        LOADER[Config Loader]
        VALIDATOR[Validator]
    end
    
    DEFAULT --> LOADER
    ENV --> LOADER
    FILE --> LOADER
    LOADER --> VALIDATOR
    VALIDATOR --> CONFIG[Final Config]
    CONFIG --> DB
```

## Build and Development

### Build Pipeline

```mermaid
graph LR
    subgraph "Build Process"
        TS[TypeScript] --> TSC[tsc]
        TSC --> JS[JavaScript]
        TSC --> DTS[Type Definitions]
        
        VUE[Vue SFC] --> VITE[Vite]
        VITE --> BUNDLE[JS Bundle]
    end
    
    subgraph "Output"
        JS --> DIST[dist/]
        DTS --> DIST
        BUNDLE --> DIST
    end
```

### Development Workflow

```bash
# Root level commands
pnpm install          # Install all dependencies
pnpm build           # Build all packages
pnpm dev             # Start dev mode
pnpm test            # Run all tests

# Package level
pnpm --filter cli dev         # Dev mode for CLI
pnpm --filter editor-ui dev   # Dev mode for frontend
```

## Testing Architecture

### Test Organization

```
package/
├── src/
│   ├── services/
│   │   ├── workflow.service.ts
│   │   └── __tests__/
│   │       └── workflow.service.test.ts
│   └── ...
└── test/
    ├── integration/
    └── e2e/
```

### Test Infrastructure

```mermaid
graph TD
    subgraph "Test Types"
        UNIT[Unit Tests<br/>Jest]
        INT[Integration Tests<br/>Jest + TestDB]
        E2E[E2E Tests<br/>Cypress]
    end
    
    subgraph "Test Utilities"
        MOCK[Mock Factories]
        TEST_DB[Test Database]
        TEST_SERVER[Test Server]
    end
    
    UNIT --> MOCK
    INT --> TEST_DB
    INT --> TEST_SERVER
    E2E --> TEST_SERVER
```

## Security Patterns

### Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Layer
    participant AUTH as AuthService
    participant JWT as JWTService
    participant DB as Database
    
    C->>API: Login Request
    API->>AUTH: Authenticate
    AUTH->>DB: Verify Credentials
    DB->>AUTH: User Data
    AUTH->>JWT: Generate Tokens
    JWT->>AUTH: Access + Refresh
    AUTH->>API: Auth Response
    API->>C: Tokens + User Info
```

### Credential Encryption

```mermaid
graph LR
    subgraph "Encryption Layer"
        PLAIN[Plain Credentials]
        KEY[Encryption Key]
        AES[AES-256-GCM]
        CIPHER[Encrypted Data]
    end
    
    PLAIN --> AES
    KEY --> AES
    AES --> CIPHER
    CIPHER --> DB[(Database)]
```

## Performance Considerations

### Caching Strategy

```mermaid
graph TD
    subgraph "Cache Layers"
        L1[Memory Cache<br/>Node Process]
        L2[Redis Cache<br/>Shared]
        L3[Database<br/>Persistent]
    end
    
    subgraph "Cache Keys"
        CRED[Credentials]
        NODE[Node Types]
        WORK[Workflow Static Data]
    end
    
    L1 --> L2
    L2 --> L3
    
    CRED --> L1
    NODE --> L1
    WORK --> L2
```

## Future Architecture Considerations

### Planned Improvements

1. **Microservices Migration**
   - Separate execution service
   - Independent webhook service
   - Dedicated authentication service

2. **Plugin System**
   - Dynamic node loading
   - Extension points
   - Custom UI components

3. **Performance Optimization**
   - Workflow compilation
   - Expression caching
   - Parallel node execution

4. **Scalability Enhancements**
   - Horizontal scaling improvements
   - Better resource isolation
   - Multi-region support