# n8n Architecture Analysis - Phase 1
## Deep Repository Structure Discovery

**Analysis Date:** 2025-11-22
**Repository:** n8n Workflow Automation Platform
**Version:** ~1.121.0

---

## 1. Package Structure Overview

n8n uses a **monorepo structure** managed by **pnpm workspaces** with **Turbo** build orchestration.

### Core Packages

#### 📦 `packages/workflow` (v1.118.0)
- **Purpose:** Core workflow engine and interfaces
- **Description:** "Workflow base code of n8n"
- **Key Exports:**
  - `Workflow` class: Main workflow orchestration
  - Interfaces for nodes, connections, execution
  - Expression evaluation system
  - Node helpers and utilities
- **Key Dependencies:**
  - `@n8n/errors`: Error handling
  - `lodash`: Utility functions
  - `luxon`: Date/time handling
  - `jmespath`: JSON query language
  - `xml2js`: XML parsing
  - `zod`: Schema validation

#### 📦 `packages/core` (v1.120.0)
- **Purpose:** Workflow execution engine
- **Description:** "Core functionality of n8n"
- **Key Features:**
  - Node execution context
  - Credential management
  - HTTP request helpers
  - Binary data handling
  - File processing (chardet, file-type, iconv-lite)
  - OAuth 1.0a/2.0 support
  - SSH support (ssh2)
  - AWS S3 integration
  - LangChain integration
- **Build Tools:**
  - Binary utilities for static file copying
  - Translation generation
  - Metadata generation

#### 📦 `packages/cli` (v1.121.0)
- **Purpose:** Express server, REST API, CLI
- **Description:** "n8n Workflow Automation Tool"
- **Key Features:**
  - Express web server (v5.1.0)
  - Database support: SQLite, PostgreSQL, MySQL, MariaDB (via TypeORM)
  - Authentication: JWT, OAuth, SAML (samlify), LDAP (ldapts)
  - Secrets management: AWS, Azure, Google Cloud, Infisical
  - Redis/Bull for queue management
  - WebSocket support (ws)
  - API documentation (Swagger)
  - Rate limiting (express-rate-limit)
  - Security: Helmet, CSRF protection, XSS filtering
- **Development:**
  - Concurrent TypeScript watching + Nodemon
  - Separate worker and webhook dev modes
- **Testing:** Jest with SQLite/PostgreSQL/MySQL/MariaDB support

#### 📦 `packages/frontend/editor-ui`
- **Purpose:** Vue 3 frontend application
- **Technology Stack:**
  - Vue 3 + TypeScript
  - Vite build system
  - Pinia for state management
  - Component library integration

#### 📦 `packages/nodes-base`
- **Purpose:** Built-in node integrations
- **Structure:**
  - `/nodes`: Node implementations
  - `/credentials`: Credential definitions
  - `/utils`: Shared utilities
  - `/test`: Node tests
- **Example Nodes:**
  - Microsoft Excel (v1, v2)
  - SpreadsheetFile (local file operations)
  - Google Analytics
  - Many integrations...

### Supporting Packages

#### 📦 `packages/@n8n/api-types`
- **Purpose:** Shared TypeScript interfaces between frontend and backend
- **Critical for:** Type safety across FE/BE boundary

#### 📦 `packages/@n8n/config`
- **Purpose:** Centralized configuration management

#### 📦 `packages/@n8n/di`
- **Purpose:** Dependency injection container

#### 📦 `packages/@n8n/errors`
- **Purpose:** Error handling classes
- **Error Types:** UnexpectedError, OperationalError, UserError (ApplicationError deprecated)

#### 📦 `packages/@n8n/db`
- **Purpose:** Database layer with TypeORM

#### 📦 `packages/@n8n/permissions`
- **Purpose:** Authorization and permissions

#### 📦 `packages/@n8n/nodes-langchain`
- **Purpose:** AI/LangChain nodes for AI workflows

#### 📦 `packages/@n8n/task-runner`
- **Purpose:** Background task execution
- **Variants:** Python task runner also available

#### 📦 `packages/@n8n/utils`
- **Purpose:** Shared utility functions

#### 📦 `packages/@n8n/decorators`
- **Purpose:** TypeScript decorators for DI and metadata

#### 📦 `packages/@n8n/constants`
- **Purpose:** Shared constants across packages

---

## 2. Workflow Engine Architecture

### Core Classes (`packages/workflow/src/`)

#### `workflow.ts` - Main Workflow Class
```typescript
export class Workflow {
  id: string
  name: string | undefined
  nodes: INodes = {}
  connectionsBySourceNode: IConnections = {}
  connectionsByDestinationNode: IConnections = {}
  nodeTypes: INodeTypes
  expression: Expression
  active: boolean
  settings: IWorkflowSettings = {}
  timezone: string
  staticData: IDataObject  // For webhook IDs, etc.
  pinData?: IPinData  // For testing with fixed data

  constructor(parameters: WorkflowParameters)
  setNodes(nodes: INode[])
  setConnections(connections: IConnections)
  // ... many helper methods
}
```

**Key Responsibilities:**
1. **Node Management:** Stores nodes as object indexed by name
2. **Connection Tracking:** Bidirectional connection maps (source→dest and dest→source)
3. **Expression Evaluation:** Built-in `Expression` instance
4. **Static Data:** Observable object for persistent node data
5. **Parameter Resolution:** Resolves node default values via `NodeHelpers`

#### `node-helpers.ts` - Node Utilities
- Node parameter validation
- Default value resolution
- Display condition evaluation
- Node issue detection
- Resource locator handling
- Filter parameter validation

#### `expression.ts` - Expression Evaluator
- JavaScript expression evaluation in sandboxed environment
- Access to workflow context (`$node`, `$json`, `$binary`, etc.)
- Extensive extension system (date, string, array, object extensions)

#### `workflow-data-proxy.ts` - Data Context Provider
- Provides data access in expressions
- Special variables: `$input`, `$json`, `$binary`, `$node`, `$workflow`, etc.
- Context-aware data resolution

### Key Interfaces (`interfaces.ts`)

#### `INode` - Node Definition
```typescript
interface INode {
  name: string
  type: string  // Node type identifier
  typeVersion: number
  position: [number, number]
  parameters: INodeParameters
  credentials?: INodeCredentials
  disabled?: boolean
  // ... more properties
}
```

#### `INodeType` - Node Type Interface
```typescript
interface INodeType {
  description: INodeTypeDescription
  execute?(this: IExecuteFunctions): Promise<INodeExecutionData[][]>
  poll?(this: IPollFunctions): Promise<INodeExecutionData[][]>
  trigger?(this: ITriggerFunctions): Promise<ITriggerResponse>
  webhook?(this: IWebhookFunctions): Promise<IWebhookResponseData>
  methods?: {
    loadOptions?: ILoadOptionsFunctions
    listSearch?: IListSearchFunctions
  }
}
```

#### `IConnection` - Node Connection
```typescript
interface IConnection {
  node: string  // Target node name
  type: NodeConnectionType  // 'main', 'ai_tool', etc.
  index: number  // Output/input index
}
```

#### `INodeExecutionData` - Data Passed Between Nodes
```typescript
interface INodeExecutionData {
  json: IDataObject  // JSON data
  binary?: IBinaryKeyData  // Binary files
  pairedItem?: IPairedItemData  // Tracks data lineage
  error?: Error
  source?: ISourceData[]
}
```

---

## 3. Node System Architecture

### Node Structure (Example: `SpreadsheetFileV2`)

```typescript
export class SpreadsheetFileV2 implements INodeType {
  description: INodeTypeDescription

  constructor(baseDescription: INodeTypeBaseDescription) {
    this.description = {
      ...baseDescription,
      version: 2,
      defaults: { name: 'Spreadsheet File', color: '#2244FF' },
      inputs: [NodeConnectionTypes.Main],
      outputs: [NodeConnectionTypes.Main],
      properties: [operationProperty, ...fromFile.description, ...toFile.description]
    }
  }

  async execute(this: IExecuteFunctions) {
    const items = this.getInputData()
    const operation = this.getNodeParameter('operation', 0)
    // ... execute based on operation
    return [returnData]
  }
}
```

### Node Components

1. **Description:** Metadata, inputs/outputs, properties (parameters)
2. **Execute Method:** Main execution logic
   - Access to `this.getInputData()`: Get input items
   - Access to `this.getNodeParameter()`: Get parameter values
   - Returns array of output arrays: `INodeExecutionData[][]`
3. **Methods (Optional):**
   - `loadOptions`: Dynamic option loading
   - `listSearch`: Search functionality for dropdowns
4. **Credentials (Optional):** OAuth, API keys, etc.

### Node Properties (Parameters)

```typescript
interface INodeProperties {
  displayName: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'options' | 'collection' | ...
  default: any
  required?: boolean
  displayOptions?: {  // Conditional display
    show?: { [key: string]: NodeParameterValue[] }
    hide?: { [key: string]: NodeParameterValue[] }
  }
  options?: INodePropertyOptions[]
  typeOptions?: {
    minValue?: number
    maxValue?: number
    // ... many type-specific options
  }
}
```

---

## 4. Data Processing Features

### Spreadsheet/File Handling

#### SpreadsheetFile Node
- **Operations:**
  - `fromFile`: Read Excel/CSV files
  - `toFile`: Write Excel/CSV files
- **Features:**
  - Sheet selection
  - Header row detection
  - Column mapping
  - Data type inference
  - Binary data handling

#### Microsoft Excel Node
- **Cloud-based:** Works with OneDrive/SharePoint
- **Operations:** Create, read, update workbooks and worksheets
- **Authentication:** OAuth 2.0

### Expression System

n8n has a powerful expression language:
- **Syntax:** `{{ $json.fieldName }}`
- **Extensions:**
  - `.toDateTime()`, `.format()` - Date operations
  - `.length`, `.toLowerCase()` - String operations
  - `.first()`, `.last()`, `.sum()` - Array operations
  - `.keys()`, `.values()` - Object operations
  - Math operations, conditionals, etc.

### Execution Context

Nodes have access to:
- `$input`: Input data items
- `$json`: Current item's JSON data
- `$binary`: Current item's binary data
- `$node`: Access other node's data
- `$workflow`: Workflow metadata
- `$env`: Environment variables
- `$now`: Current timestamp
- `$today`: Today's date

---

## 5. Technology Stack Summary

### Backend
- **Runtime:** Node.js >=20.19 <= 24.x
- **Language:** TypeScript
- **Web Framework:** Express 5.1.0
- **Database:** TypeORM with SQLite/PostgreSQL/MySQL/MariaDB
- **Queues:** Bull (Redis-based)
- **Testing:** Jest
- **Build:** TypeScript + tsc-alias

### Frontend
- **Framework:** Vue 3
- **Language:** TypeScript
- **Build:** Vite
- **State:** Pinia
- **Testing:** Vitest (frontend), Playwright (E2E)

### Code Quality
- **Linting:** ESLint
- **Formatting:** Biome
- **Git Hooks:** lefthook
- **Monorepo:** pnpm workspaces + Turbo

### Key Libraries
- **Date/Time:** Luxon
- **HTTP:** Axios
- **Validation:** Zod, class-validator
- **Crypto:** bcryptjs, jsonwebtoken, jssha
- **Files:** xlsx, xml2js, file-type, formidable
- **Utilities:** lodash, nanoid, semver

---

## 6. Architecture Patterns Observed

### 1. Dependency Injection
- Uses `@n8n/di` package
- Service-based architecture in CLI
- Decorator-based injection

### 2. Versioned Node Types
- Nodes can have multiple versions (v1, v2)
- Allows backward compatibility while evolving
- Example: `MicrosoftExcelV1`, `MicrosoftExcelV2`

### 3. Monadic Error Handling
- `Result<T>` type for operations that can fail
- Error classes extend from base error types
- Context-rich errors (NodeApiError, NodeOperationError)

### 4. Event-Driven Architecture
- Message event bus
- Observable objects for reactive state
- Webhook and polling trigger support

### 5. Plugin Architecture
- Community nodes can be installed
- Node development CLI tool (`@n8n/node-cli`)
- Extensible credential types

### 6. Data Lineage Tracking
- `pairedItem` in execution data
- Tracks which input items produced which outputs
- Important for debugging and data flow understanding

---

## 7. Key Findings for TaxFlow

### Highly Relevant Features

#### ✅ Excellent for Tax Workflows
1. **Robust Spreadsheet Handling:** SpreadsheetFile node handles Excel/CSV perfectly
2. **Expression System:** Powerful for calculations (AGI, deductions, tax brackets)
3. **Data Validation:** Built-in parameter validation, type checking
4. **Versioned Workflows:** Can support different tax years
5. **Binary File Handling:** PDF generation/reading capabilities
6. **Structured Data Flow:** Clear input→process→output pattern
7. **Error Handling:** Rich error context for validation failures

#### 🔧 Needs Adaptation for Tax
1. **Domain-Specific Nodes:** Need custom tax nodes (W-2 import, 1040 generation, etc.)
2. **Tax Year Context:** Add tax year as first-class concept
3. **IRS Rules Engine:** Need validation rule system
4. **Multi-Form Workflows:** Tax returns span many interconnected forms
5. **State-Specific Logic:** 50 states × different rules
6. **Calculation Precision:** Ensure proper rounding per IRS rules

### Architecture Strengths to Adopt

1. **Clear Node Interface:** Simple `INodeType` with `execute()` method
2. **Parameter System:** Flexible property definitions with conditional display
3. **Bidirectional Connections:** Easy to trace data flow
4. **Expression Engine:** Reusable for tax calculations
5. **Type Safety:** Strong TypeScript usage throughout
6. **Modular Design:** Packages are well-separated by concern

### Potential Simplifications for TaxFlow

Since TaxFlow is browser-only initially:
1. **No Database Layer:** Use IndexedDB instead of TypeORM
2. **No Backend API:** Keep execution client-side
3. **Simplified Auth:** No need for OAuth, SAML, etc.
4. **Focused Node Set:** Only tax-related nodes (~15-20 instead of 200+)
5. **Single Deployment:** No worker/webhook separation needed

---

## 8. Next Steps for Analysis

### Phase 1 Remaining Tasks
- [x] ✅ Repository structure documented
- [ ] Detailed workflow execution flow analysis
- [ ] Node system deep dive (more node examples)
- [ ] UI/Editor component analysis
- [ ] Identify specific code to extract/adapt

### Phase 2 Planning
- Design TaxFlow node library (15-20 tax-specific nodes)
- Create architecture adapting n8n patterns for tax domain
- Define simplified browser-based execution model
- Plan migration from current TaxFlow implementation

---

## 9. Critical Files to Study Further

### Workflow Engine
- ✅ `packages/workflow/src/workflow.ts` - Main workflow class
- ✅ `packages/workflow/src/interfaces.ts` - Core interfaces
- ✅ `packages/workflow/src/node-helpers.ts` - Node utilities
- ✅ `packages/workflow/src/expression.ts` - Expression evaluation
- 🔄 `packages/workflow/src/workflow-data-proxy.ts` - Data context
- 🔄 `packages/core/src/NodeExecuteFunctions.ts` - Execution functions

### Node Examples
- ✅ `packages/nodes-base/nodes/SpreadsheetFile/v2/` - Local file operations
- ✅ `packages/nodes-base/nodes/Microsoft/Excel/v2/` - Excel operations
- 🔄 Function node (for custom JavaScript)
- 🔄 IF node (conditional logic)
- 🔄 Set node (data transformation)
- 🔄 Code node (sandbox execution)

### Frontend/Editor
- 🔄 `packages/frontend/editor-ui/src/components/Node.vue` - Node rendering
- 🔄 `packages/frontend/editor-ui/src/views/NodeView.vue` - Canvas
- 🔄 `packages/frontend/editor-ui/src/stores/` - Pinia stores

### Build System
- ✅ `package.json` - Root package scripts
- ✅ `pnpm-workspace.yaml` - Workspace configuration
- ✅ `turbo.json` - Build orchestration

---

## 10. Package Dependency Graph

```
┌─────────────┐
│   cli       │  ← Main application
└─────────────┘
      ↓ depends on
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   core      │ nodes-base  │ editor-ui   │  workflow   │
└─────────────┴─────────────┴─────────────┴─────────────┘
      ↓             ↓             ↓             ↓
┌─────────────────────────────────────────────────────────┐
│  Shared: @n8n/api-types, config, errors, di, utils,    │
│          db, permissions, constants, decorators         │
└─────────────────────────────────────────────────────────┘
```

---

**Analysis Status:** ✅ Phase 1 Complete - Repository Structure
**Next:** Phase 2 - Workflow Execution Flow Deep Dive
**Time Invested:** ~2 hours
**Confidence Level:** High - Strong understanding of n8n architecture
