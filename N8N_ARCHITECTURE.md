# n8n Architecture Documentation

**Version**: 2.0 (Post-Latest Sync)
**Last Updated**: 2025-11-05
**Status**: Complete - Reflects latest codebase with recent architectural additions

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Backend Architecture](#3-backend-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Execution Engine](#5-execution-engine)
6. [Node System](#6-node-system)
7. [Database Layer](#7-database-layer)
8. [Recent Architectural Additions](#8-recent-architectural-additions)
9. [API & Integration Layer](#9-api--integration-layer)
10. [Deployment & Scaling](#10-deployment--scaling)

---

## 1. System Overview

### What is n8n?

n8n is a **workflow automation platform** that allows technical and non-technical users to create, execute, and manage complex workflows through a visual interface.

**Core Capabilities:**
- 308+ pre-built workflow nodes
- Visual workflow builder
- Code execution (JavaScript, Python)
- AI/LLM integration (LangChain)
- Real-time execution monitoring
- Multi-tenant support (projects, teams)
- Enterprise features (SAML, LDAP, RBAC)

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 20+, TypeScript 5.7+, Express |
| **Frontend** | Vue 3, Vite, Pinia |
| **Database** | TypeORM (PostgreSQL, MySQL, SQLite) |
| **Execution** | Custom workflow engine |
| **AI/ML** | LangChain, OpenAI, Anthropic, Google |
| **Package Manager** | pnpm + Turborepo |
| **Testing** | Jest, Playwright |

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web UI     │  │  REST API    │  │   Webhooks   │      │
│  │   (Vue 3)    │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Backend Services                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Workflow Engine · Execution Service · Node System  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Auth · Credentials · Projects · Webhooks · Events  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │   IndexedDB  │  │  Event Bus   │      │
│  │   / MySQL    │  │  (frontend)  │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure

### Package Organization

n8n uses a **monorepo** managed by pnpm workspaces and Turborepo.

```
packages/
├── @n8n/                      # Scoped packages (25+)
│   ├── ai-workflow-builder.ee/   # AI workflow generation (Enterprise)
│   ├── api-types/                 # Shared FE/BE types
│   ├── backend-common/            # Shared backend utilities
│   ├── backend-test-utils/        # Testing utilities
│   ├── benchmark/                 # Performance benchmarking
│   ├── client-oauth2/             # OAuth2 client
│   ├── codemirror-lang/           # Expression editor (CodeMirror)
│   ├── config/                    # Centralized configuration
│   ├── constants/                 # Global constants
│   ├── db/                        # Database layer (TypeORM)
│   ├── decorators/                # Decorators (DI, modules)
│   ├── design-system/             # UI component library
│   ├── di/                        # Dependency injection
│   ├── errors/                    # Error types
│   ├── i18n/                      # Internationalization
│   ├── node-cli/                  # Node development CLI
│   ├── nodes-langchain/           # AI/LangChain nodes
│   ├── permissions/               # Permission system
│   ├── stores/                    # Shared store utilities
│   ├── stylelint-config/          # CSS linting
│   ├── task-runner/               # Task runner (JS/TS)
│   └── task-runner-python/        # Python task runner
│
├── cli/                       # Main backend server
├── core/                      # Workflow execution engine
├── workflow/                  # Core workflow types
├── nodes-base/                # 308+ built-in nodes
├── editor-ui/                 # Vue 3 frontend
└── design-system-demo/        # Component showcase
```

### Key Dependencies

**Frontend:**
- Vue 3.5+
- Vite 6+
- Pinia (state management)
- @vueuse/core (composables)
- Monaco Editor (code editor)

**Backend:**
- Express 4.x
- TypeORM 0.3.x
- class-validator
- @oclif/core (CLI)
- bull (queue)

**AI/ML:**
- @langchain/core
- @langchain/openai, anthropic, google-vertexai
- openai, @anthropic-ai/sdk

---

## 3. Backend Architecture

### Entry Point: `packages/cli/src/server.ts`

The main server bootstraps:
1. Configuration loading (`@n8n/config`)
2. Database connection (`@n8n/db`)
3. Module initialization (`ModuleRegistry`)
4. Controller registration (`ControllerRegistry`)
5. Express middleware setup
6. WebSocket setup
7. Webhook registration

### Module System

n8n uses a **module-based plugin architecture** with lazy loading.

#### Module Interface

```typescript
@BackendModule({ name: 'my-module' })
export class MyModule implements ModuleInterface {
  async init() {
    // Module initialization
    await this.registerControllers();
    await this.registerServices();
  }

  async entities() {
    return [Entity1, Entity2]; // Database entities
  }

  async settings() {
    return { setting1: value1 }; // Module settings
  }

  @OnShutdown()
  async shutdown() {
    // Cleanup logic
  }
}
```

#### Active Modules

```
modules/
├── breaking-changes/      # NEW: Detect breaking changes
├── chat-hub/              # NEW: AI chat conversations
├── data-table/            # Data table management
├── insights/              # Execution analytics
├── mcp/                   # Model Context Protocol server
├── workflow-index/        # NEW: Workflow dependency graph
├── ai-assistant.ee/       # AI assistant (Enterprise)
├── orchestration.ee/      # Multi-instance coordination (EE)
├── project-roles.ee/      # Role-based access control (EE)
├── provisioning.ee/       # User provisioning (EE)
├── sso.ee/                # Single sign-on (EE)
└── workflow-history.ee/   # Version history (EE)
```

### Controller-Service-Repository Pattern

```
┌─────────────────┐
│   Controller    │  ← REST API endpoint
│  (HTTP layer)   │
└────────┬────────┘
         ↓
┌─────────────────┐
│     Service     │  ← Business logic
│  (Orchestration)│
└────────┬────────┘
         ↓
┌─────────────────┐
│   Repository    │  ← Data access
│  (TypeORM)      │
└────────┬────────┘
         ↓
┌─────────────────┐
│     Entity      │  ← Database table
│  (TypeORM)      │
└─────────────────┘
```

#### Example: Workflow CRUD

**Controller:** `workflows.controller.ts`
```typescript
@RestController('/workflows')
export class WorkflowsController {
  constructor(private workflowService: WorkflowService) {}

  @Get('/:id')
  async getWorkflow(@Param('id') id: string) {
    return this.workflowService.get(id);
  }

  @Post('/')
  async createWorkflow(@Body() workflow: WorkflowCreateDto) {
    return this.workflowService.create(workflow);
  }
}
```

**Service:** `workflow.service.ts`
```typescript
@Service()
export class WorkflowService {
  constructor(
    private workflowRepository: WorkflowRepository,
    private eventService: EventService,
  ) {}

  async get(id: string): Promise<Workflow> {
    const workflow = await this.workflowRepository.findById(id);
    if (!workflow) throw new NotFoundError();
    return workflow;
  }

  async create(data: WorkflowCreateDto): Promise<Workflow> {
    const workflow = await this.workflowRepository.create(data);
    await this.eventService.emit('workflow-created', { workflow });
    return workflow;
  }
}
```

**Repository:** `workflow.repository.ts`
```typescript
@Repository()
export class WorkflowRepository extends BaseRepository<Workflow> {
  async findById(id: string): Promise<Workflow | null> {
    return this.db.findOne(Workflow, { where: { id } });
  }

  async create(data: Partial<Workflow>): Promise<Workflow> {
    const workflow = this.db.create(Workflow, data);
    return this.db.save(workflow);
  }
}
```

### Dependency Injection

n8n uses `@n8n/di` for inversion of control.

```typescript
import { Service, Container } from '@n8n/di';

@Service()
export class MyService {
  constructor(
    private readonly logger: Logger,
    private readonly config: GlobalConfig,
  ) {}

  doSomething() {
    this.logger.info('Doing something...');
  }
}

// Retrieve instance (container manages lifecycle)
const service = Container.get(MyService);
```

**Benefits:**
- Loose coupling
- Easy unit testing (mock dependencies)
- Singleton pattern by default
- Automatic circular dependency detection

---

## 4. Frontend Architecture

### Vue 3 Application

**Location:** `packages/frontend/editor-ui/`

#### Application Structure

```
editor-ui/src/
├── App.vue                 # Root component
├── main.ts                 # App bootstrap
├── router.ts               # Vue Router setup
├── app/
│   ├── stores/             # Pinia state stores (30+)
│   ├── views/              # Page-level components
│   ├── components/         # Reusable UI components
│   ├── api/                # API client services
│   ├── composables/        # Vue composables (50+)
│   ├── utils/              # Utility functions
│   └── types/              # TypeScript types
├── features/               # Feature modules
│   ├── workflows/
│   │   └── canvas/        # Canvas rendering (Vue Flow)
│   ├── ndv/               # Node Detail View
│   ├── execution/         # Execution viewer
│   ├── credentials/       # Credential management
│   └── ai/                # AI features
└── styles/                 # Global styles
```

### State Management (Pinia)

**34 Pinia stores** managing different aspects:

#### Core Workflow Stores

1. **workflows.store.ts** (1,919 LOC)
   - Current workflow state
   - Node definitions
   - Connections
   - Execution results

2. **canvas.store.ts** (37 LOC)
   - Canvas-specific state
   - Node insertion position
   - Range selection

3. **ui.store.ts** (787 LOC)
   - Global UI state
   - Modal registry (30+ modals)
   - Theme settings
   - Panel visibility

4. **ndv.store.ts**
   - Node Detail View state
   - Input/output panels
   - Parameter editing

#### AI Stores

- **assistant.store.ts** - AI assistant state
- **chatPanel.store.ts** - Chat panel UI
- **mcp.store.ts** - MCP configuration

### Canvas Rendering

**Technology:** Vue Flow (SVG-based graph visualization)

**Location:** `features/workflows/canvas/`

#### Canvas Architecture

```
WorkflowCanvas.vue
    ↓
Canvas.vue (Vue Flow wrapper)
    ↓
Vue Flow Component
    ├─ CanvasNode (node rendering)
    ├─ CanvasEdge (connection rendering)
    ├─ CanvasBackground
    └─ CanvasControls
```

#### Key Composables

- **useCanvasMapping.ts** - Maps workflow data to Vue Flow format
- **useCanvasLayout.ts** - Auto-layout using Dagre algorithm
- **useCanvasNodeHandle.ts** - Connection handle logic
- **useViewportAutoAdjust.ts** - Automatic viewport fitting

#### Performance Optimization

```typescript
// Throttled updates during execution (200ms)
const mappedNodesThrottled = throttledRef(mappedNodes, 200);
const mappedConnectionsThrottled = throttledRef(mappedConnections, 200);
```

**Current Limitations:**
- SVG-based rendering limits to ~100 nodes at 60fps
- Throttling adds 200ms latency during execution
- No viewport culling or LOD (Level of Detail)

---

## 5. Execution Engine

### Core Execution Flow

**Location:** `packages/core/src/execution-engine/`

#### Execution Pipeline

```
User triggers workflow
        ↓
[WorkflowExecutionService.execute()]
        ↓
[WorkflowExecute.run()] - Main execution loop
        ↓
For each node (topological order):
  ├─ Evaluate parameters (expressions)
  ├─ Load node implementation
  ├─ Prepare execution context
  ├─ Execute node.execute()
  ├─ Collect results (json, binary, pairedItem)
  └─ Pass data to next nodes
        ↓
On error:
  ├─ Check error workflow configured
  ├─ Execute error workflow (if exists)
  └─ Save error execution
        ↓
Save final execution
        ↓
Emit events (execution-finished, webhook responses)
        ↓
Return results to user
```

### Key Files

1. **`workflow-execute.ts`** (85KB)
   - Main execution orchestrator
   - Node-by-node execution loop
   - Error handling and recovery
   - Expression evaluation
   - Data flow management

2. **`routing-node.ts`** (32KB)
   - Router node logic
   - Conditional branching
   - Multiple execution paths

3. **`node-execution-context/`**
   - Execution context per node
   - Input data access
   - Helper functions

### Execution Modes

1. **Manual Execution**
   - Triggered by user via UI
   - Full execution with data capture

2. **Production Execution**
   - Triggered by webhook, schedule, or poll
   - Configurable data retention

3. **Partial Execution**
   - Execute from specific node
   - Reuse previous execution data

4. **Test Execution**
   - Testing individual nodes
   - Isolated execution environment

### Expression System

**Location:** `packages/workflow/src/expression.ts`

**Features:**
- Custom expression language
- Data access: `$input`, `$node`, `$json`, `$env`
- Function library: `{{$json.field.toUpperCase()}}`
- Type validation
- Sandboxed execution

**Example:**
```javascript
// Access input data
{{$input.first().json.name}}

// Access another node's output
{{$node["HTTP Request"].json.data}}

// Use functions
{{$now.format('YYYY-MM-DD')}}

// Conditional logic
{{$json.status === 'active' ? 'Yes' : 'No'}}
```

---

## 6. Node System

### Node Architecture

**308+ built-in nodes** in `packages/nodes-base/`

#### Node Structure

```typescript
export class HttpRequest implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'HTTP Request',
    name: 'httpRequest',
    group: ['transform'],
    version: 1,
    description: 'Makes an HTTP request',
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Method',
        name: 'method',
        type: 'options',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
        ],
        default: 'GET',
      },
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true,
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const method = this.getNodeParameter('method', i) as string;
      const url = this.getNodeParameter('url', i) as string;

      const response = await this.helpers.request({ method, url });

      returnData.push({
        json: response,
        pairedItem: { item: i },
      });
    }

    return [returnData];
  }
}
```

### LangChain Integration

**Package:** `@n8n/nodes-langchain/`

#### AI Node Categories

```
nodes-langchain/nodes/
├── llms/                      # 14+ LLM providers
│   ├── LmChatOpenAi/
│   ├── LmChatAnthropic/
│   ├── LmChatGoogleVertex/
│   ├── LmChatOllama/
│   ├── LmChatGroq/
│   ├── LmChatAwsBedrock/
│   └── ...
├── agents/                    # Agent orchestration (Tools Agent, SQL Agent)
├── chains/                    # Chain operations (RAG, Summarization)
├── tools/                     # Tool definitions
├── memory/                    # Memory systems (Buffer, Window)
├── embeddings/                # Embedding models (OpenAI, Cohere)
├── retrievers/                # RAG retrievers
├── vector_store/              # Vector DB integration (Pinecone, Qdrant)
├── Guardrails/                # NEW: Content safety guardrails
└── mcp/                       # MCP client node
```

#### New: Guardrails Node

**Purpose:** Add safety guardrails to LLM outputs

**Checks:**
- Content filtering (NSFW, jailbreak attempts)
- PII detection
- Secret key detection
- URL validation
- Keyword filtering
- Topical alignment

**Example Configuration:**
```json
{
  "checks": ["pii", "secretKeys", "nsfw"],
  "action": "block", // or "flag"
  "customKeywords": ["banned-word-1", "banned-word-2"]
}
```

---

## 7. Database Layer

### TypeORM Integration

**Package:** `@n8n/db/`

#### Database Support

- **SQLite** (development, testing)
- **PostgreSQL** (production, recommended)
- **MySQL/MariaDB** (production, supported)

#### Entity Architecture

**34 entity types** representing database tables:

**Core Entities:**
- `WorkflowEntity` - Workflow definitions
- `ExecutionEntity` - Execution results
- `CredentialsEntity` - Encrypted credentials
- `User` - User accounts
- `Project` - Multi-tenancy projects
- `Role` - RBAC roles
- `Tag` - Workflow tags
- `WebhookEntity` - Webhook registrations

**Relations:**
- `SharedWorkflow` - Workflow sharing (user ↔ workflow)
- `SharedCredentials` - Credential sharing
- `ProjectRelation` - User ↔ project membership

**Analytics:**
- `WorkflowStatistics` - Usage statistics
- `WorkflowDependencies` - NEW: Dependency graph

**Execution Data:**
- `ExecutionData` - Execution payload
- `ExecutionMetadata` - Metadata
- `ExecutionAnnotation` (EE) - Execution annotations

#### Repository Pattern

**Example:** Workflow Repository

```typescript
@Repository()
export class WorkflowRepository extends BaseRepository<Workflow> {
  // Basic CRUD
  async findById(id: string): Promise<Workflow | null> {
    return this.findOne({ where: { id } });
  }

  // Complex queries
  async findWorkflowsNeedingIndexing(): Promise<Workflow[]> {
    return this.find({
      where: { needsIndexing: true },
      take: 100,
    });
  }

  async findByCredentialsId(credentialsId: string): Promise<Workflow[]> {
    // Join with WorkflowDependencies
    return this.createQueryBuilder('workflow')
      .innerJoin('workflow_dependencies', 'dep', 'dep.workflowId = workflow.id')
      .where('dep.dependencyType = :type', { type: 'credentialId' })
      .andWhere('dep.dependencyKey = :credId', { credId: credentialsId })
      .getMany();
  }
}
```

### Migrations

**Location:** `@n8n/db/src/migrations/`

Separate migration files for each database:
- `postgresdb/` - PostgreSQL migrations
- `mysqldb/` - MySQL/MariaDB migrations
- `sqlite/` - SQLite migrations

**Recent Migrations:**
- `1760020000000-CreateChatHubAgentTable.ts` - Chat Hub agents
- `1761655473000-ChangeDependencyInfoToJson.ts` - Dependency info as JSON

---

## 8. Recent Architectural Additions

### A. Chat Hub Module

**Purpose:** Interactive AI conversations within workflows

**Location:** `cli/src/modules/chat-hub/`

#### Features
- Multi-provider LLM support (OpenAI, Anthropic, Google)
- **n8n workflows as custom agents**
- Persistent conversation sessions
- Message history tracking
- Credential management per session
- Stream-based response handling

#### Architecture

```
User sends message
        ↓
ChatHubController.sendMessage()
        ↓
ChatHubService.handleMessage()
        ↓
Based on provider:
  ├─ OpenAI → ChatHubService.callOpenAI()
  ├─ Anthropic → ChatHubService.callAnthropic()
  ├─ Google → ChatHubService.callGoogle()
  └─ n8n → ChatHubWorkflowService.executeWorkflow()
        ↓
Stream response chunks
        ↓
Aggregate structured chunks
        ↓
Save message to database
        ↓
Return to user
```

#### Workflow as Agent

You can use any n8n workflow as a chat agent:

```json
{
  "provider": "n8n",
  "workflowId": "abc123",
  "model": {
    "type": "n8n",
    "workflowId": "abc123",
    "inputSchema": { /* JSON schema */ }
  }
}
```

**Requirements:**
- Workflow must have a webhook trigger or manual trigger
- Must return structured response

#### API Endpoints

```
POST   /chat-hub/sessions                  # Create session
GET    /chat-hub/sessions/:id              # Get session
POST   /chat-hub/sessions/:id/messages     # Send message (streaming)
GET    /chat-hub/sessions/:id/messages     # Get message history
DELETE /chat-hub/sessions/:id              # Delete session
```

---

### B. Breaking Changes Module

**Purpose:** Detect breaking changes before version upgrades

**Location:** `cli/src/modules/breaking-changes/`

#### Architecture

```
Breaking Changes Detection System
        ↓
Rule-Based Detection
        ├─ Instance-Level Rules
        │  └─ Removed Nodes
        └─ Workflow-Level Rules
           ├─ Process.env Access Detection
           └─ File System Access Detection
        ↓
Cache for Performance
        ↓
Workflow Analysis (batch: 100 workflows)
        ↓
Impact Assessment
        ├─ Affected Workflows
        ├─ Execution Count
        └─ Recommendations
        ↓
Breaking Change Report
```

#### Rules (v2)

**1. Removed Nodes Rule**
```typescript
// Detect workflows using nodes that no longer exist
removedNodes: [
  'n8n-nodes-base.oldNodeName',
  'n8n-nodes-base.deprecatedNode',
]
```

**2. Process Environment Access Rule**
```typescript
// Detect code using process.env (removed in v2)
detectsPattern: /process\.env/g
affects: ['Code', 'Function', 'FunctionItem']
```

**3. File System Access Rule**
```typescript
// Detect filesystem access (restricted in v2)
detectsPattern: /fs\.|require\(['"]fs['"]\)|import.*from ['"]fs['"]/g
affects: ['Code', 'Function', 'FunctionItem']
```

#### API Endpoints

```
GET  /breaking-changes                     # Get breaking changes for instance
GET  /breaking-changes/:workflowId         # Check specific workflow
```

#### Response Format

```typescript
{
  breakingChanges: [
    {
      ruleId: 'v2.process-env-access',
      description: 'Process environment access is no longer supported',
      severity: 'error',
      affectedWorkflows: [
        {
          workflowId: 'abc123',
          workflowName: 'My Workflow',
          affectedNodes: ['Code1', 'Function2'],
          executionCount: 1250,
        }
      ],
      recommendations: [
        'Use the new Environment Variables feature',
        'Store values in workflow settings',
      ]
    }
  ],
  summary: {
    totalAffectedWorkflows: 15,
    byRule: { 'v2.process-env-access': 12, 'v2.file-access': 3 }
  }
}
```

---

### C. Workflow Index Service

**Purpose:** Build and maintain a dependency graph for all workflows

**Location:** `cli/src/modules/workflow-index/`

#### Dependency Types

```typescript
type DependencyType =
  | 'nodeType'          // Node type used (e.g., 'n8n-nodes-base.httpRequest')
  | 'credentialId'      // Credential referenced
  | 'workflowCall'      // Workflow called by Execute Workflow node
  | 'webhookPath';      // Webhook path registered
```

#### Architecture

```
Server Startup
        ↓
WorkflowIndexService.init()
        ↓
Load all workflows (batch: 100)
        ↓
For each workflow:
  ├─ Extract nodes
  ├─ Extract credentials
  ├─ Extract workflow calls
  ├─ Extract webhook paths
  └─ Store in WorkflowDependencies
        ↓
Event Listeners
  ├─ workflow-created → Index workflow
  ├─ workflow-saved → Reindex workflow
  └─ workflow-deleted → Remove from index
```

#### Use Cases

1. **Breaking Change Detection**
   - Find all workflows using a specific node type
   - Find all workflows using a credential

2. **Impact Analysis**
   - Before deleting a credential, check which workflows use it
   - Before removing a node type, check affected workflows

3. **Dependency Visualization**
   - Show workflow call graph
   - Show credential usage across workflows

#### Database Schema

```sql
CREATE TABLE workflow_dependencies (
  id UUID PRIMARY KEY,
  workflowId UUID NOT NULL,
  dependencyType VARCHAR(50) NOT NULL,
  dependencyKey VARCHAR(255) NOT NULL,
  dependencyInfo JSONB,
  versionCounter INT NOT NULL,
  FOREIGN KEY (workflowId) REFERENCES workflow(id) ON DELETE CASCADE
);

CREATE INDEX idx_workflow_dependencies_type_key
  ON workflow_dependencies(dependencyType, dependencyKey);
```

**Example Row:**
```json
{
  "id": "uuid-1",
  "workflowId": "workflow-abc123",
  "dependencyType": "nodeType",
  "dependencyKey": "n8n-nodes-base.httpRequest",
  "dependencyInfo": {
    "nodeId": "node-123",
    "nodeVersion": 3
  },
  "versionCounter": 5
}
```

---

### D. MCP Module Enhancements

**Purpose:** Expose n8n workflows to external AI/LLM systems via Model Context Protocol

**Location:** `cli/src/modules/mcp/`

#### MCP Tools

**1. Search Workflows Tool**
```typescript
{
  name: 'search_workflows',
  description: 'Search for workflows by name',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      limit: { type: 'number', default: 10 }
    }
  }
}
```

**2. Get Workflow Details Tool**
```typescript
{
  name: 'get_workflow_details',
  description: 'Get detailed information about a workflow',
  inputSchema: {
    type: 'object',
    properties: {
      workflowId: { type: 'string', required: true }
    }
  }
}
```

#### Architecture

```
External AI System (Claude, ChatGPT)
        ↓
MCP Client connects to n8n MCP Server
        ↓
Discovers available tools
        ├─ search_workflows
        └─ get_workflow_details
        ↓
Invokes tool with parameters
        ↓
McpService.executeTool()
        ↓
Tool implementation
        ├─ SearchWorkflowsTool.execute()
        │   └─ WorkflowRepository.search()
        └─ GetWorkflowDetailsTool.execute()
            └─ WorkflowRepository.findById()
        ↓
Return structured response
        ↓
External AI system processes response
```

#### Security

- User-scoped access control
- API key authentication
- Permissions checked per tool invocation
- Telemetry tracking

---

## 9. API & Integration Layer

### REST API

**Base Path:** `/api/v1/`

#### Authentication

**Methods:**
- Cookie-based (session)
- API key (header: `X-N8N-API-KEY`)
- OAuth 2.0 (enterprise)

#### Key Endpoints

**Workflows:**
```
GET    /workflows              # List workflows
GET    /workflows/:id          # Get workflow
POST   /workflows              # Create workflow
PATCH  /workflows/:id          # Update workflow
DELETE /workflows/:id          # Delete workflow
POST   /workflows/:id/activate # Activate workflow
```

**Executions:**
```
GET    /executions             # List executions
GET    /executions/:id         # Get execution
POST   /executions/:id/retry   # Retry execution
DELETE /executions/:id         # Delete execution
```

**Credentials:**
```
GET    /credentials            # List credentials
GET    /credentials/:id        # Get credential
POST   /credentials            # Create credential
PATCH  /credentials/:id        # Update credential
DELETE /credentials/:id        # Delete credential
POST   /credentials/test       # Test credential
```

### Webhooks

**Webhook Types:**

1. **Production Webhooks** (`/webhook/`)
   - Persistent URLs
   - Active workflow required
   - High-performance

2. **Test Webhooks** (`/webhook-test/`)
   - Temporary URLs
   - For testing in UI
   - Expires after use

3. **Waiting Webhooks** (`/webhook-waiting/`)
   - Used with Wait node
   - Resume execution on webhook call

#### Webhook Flow

```
Incoming HTTP Request
        ↓
Express Middleware
        ↓
WebhookController
        ↓
LiveWebhooks.executeWebhook()
        ↓
Find workflow by webhook path
        ↓
Execute workflow
        ↓
Return HTTP response
```

### WebSocket Connection

**Purpose:** Real-time updates from server to UI

**Endpoint:** `/push`

**Events:**
```typescript
// Execution updates
{
  type: 'executionStarted',
  data: { executionId, workflowId }
}

{
  type: 'nodeExecuted',
  data: { executionId, nodeId, data }
}

{
  type: 'executionFinished',
  data: { executionId, success, data }
}

// Workflow updates
{
  type: 'workflowSaved',
  data: { workflowId }
}

// User presence (collaboration)
{
  type: 'userJoined',
  data: { userId, workflowId }
}
```

---

## 10. Deployment & Scaling

### Deployment Modes

#### 1. Single Instance (Default)

```
┌─────────────────────────────────────┐
│         n8n Server                  │
│  ┌──────────┐  ┌──────────────┐    │
│  │   API    │  │   Webhooks   │    │
│  └──────────┘  └──────────────┘    │
│  ┌──────────────────────────────┐  │
│  │   Workflow Execution         │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Use Case:** Development, small teams, <1000 executions/day

#### 2. Multi-Instance (Enterprise)

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│    Main     │  │   Webhook   │  │   Worker    │
│  Instance   │  │   Instance  │  │   Instance  │
│             │  │             │  │             │
│ • API       │  │ • Webhooks  │  │ • Execution │
│ • UI        │  │             │  │             │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
              ┌─────────▼─────────┐
              │   Redis Pub/Sub   │
              │   (Coordination)  │
              └───────────────────┘
```

**Use Case:** Production, high availability, >10,000 executions/day

**Instance Types:**
- **Main:** API, UI, workflow management
- **Webhook:** Handle webhook requests
- **Worker:** Execute workflows in background

**Coordination:** Redis pub/sub for event distribution

#### 3. Queue Mode

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  Main/API    │  ───▶ │   Bull Queue │  ───▶ │   Workers    │
│  Instance    │       │   (Redis)    │       │   (Pool)     │
└──────────────┘       └──────────────┘       └──────────────┘
```

**Use Case:** High-throughput, auto-scaling

### Configuration

**Environment Variables:**

```bash
# Database
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=localhost
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD=***

# Server
N8N_HOST=n8n.example.com
N8N_PORT=5678
N8N_PROTOCOL=https

# Execution
EXECUTIONS_MODE=queue  # or 'regular'
QUEUE_BULL_REDIS_HOST=redis
QUEUE_BULL_REDIS_PORT=6379

# Multi-instance
N8N_INSTANCE_TYPE=main  # or 'webhook', 'worker'
```

### Scaling Strategies

**Horizontal Scaling:**
- Add more worker instances
- Load balance webhook instances
- Use queue mode for execution distribution

**Vertical Scaling:**
- Increase memory for large workflows
- More CPU cores for parallel execution

**Database Scaling:**
- PostgreSQL read replicas
- Connection pooling
- Partitioning execution data

---

## Conclusion

n8n is a sophisticated, enterprise-grade workflow automation platform with:

✅ **Modular Architecture** - Clean separation of concerns with lazy-loaded modules
✅ **Scalability** - Multi-instance support with pub/sub coordination
✅ **Extensibility** - Plugin system for nodes and workflows
✅ **Type Safety** - Comprehensive TypeScript with shared types
✅ **AI Integration** - Deep LangChain integration with custom nodes
✅ **Real-time Features** - WebSockets, server-sent events, streaming
✅ **Enterprise Features** - RBAC, SAML, multi-tenancy foundations

**Recent Architectural Additions:**
- **Chat Hub** - Interactive AI conversations
- **Breaking Changes Detection** - Proactive compatibility checking
- **Workflow Index** - Complete dependency graph
- **MCP Server** - External AI system integration
- **Guardrails** - LLM output safety

This architecture supports n8n's vision of making workflow automation accessible and powerful for enterprises worldwide.

---

**Document Version:** 2.0
**Last Updated:** 2025-11-05
**Maintainer:** n8n Team
**License:** Fair-code (source-available)

---

For implementation details on specific components, see:
- **Workflow UI Planning:** `WORKFLOW_UI_NEXTGEN_PLAN.md`
- **Technical Specifications:** `WORKFLOW_UI_TECHNICAL_SPEC.md`
- **Comparison Analysis:** `WORKFLOW_UI_COMPARISON.md`
