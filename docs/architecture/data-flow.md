# n8n Data Flow Architecture

> **⚠️ Notice**: This document was created by AI and not properly reviewed by the team yet.

This document explains how data flows through n8n, from workflow creation to execution completion, including data storage, transformation, and security considerations.

## Overview

Data in n8n flows through several layers:
1. **Input Layer**: Triggers, webhooks, manual starts
2. **Processing Layer**: Workflow engine, node execution
3. **Storage Layer**: Database, file system, external storage
4. **Output Layer**: Results, webhooks, integrations

## Workflow Execution Data Flow

### Execution Lifecycle

```mermaid
sequenceDiagram
    participant T as Trigger/User
    participant API as API Layer
    participant WE as Workflow Engine
    participant NE as Node Executor
    participant DS as Data Store
    participant EH as Event Handlers

    T->>API: Initiate Execution
    API->>API: Validate Request
    API->>DS: Create Execution Record
    API->>WE: Start Workflow

    loop For Each Node
        WE->>NE: Execute Node
        NE->>NE: Process Input Data
        NE->>DS: Store Node Output
        NE->>WE: Return Results
        WE->>EH: Emit Progress Event
    end

    WE->>DS: Finalize Execution
    WE->>EH: Emit Completion Event
    WE->>API: Return Results
    API->>T: Send Response
```

### Data Transformation Pipeline

Each node in a workflow transforms data through several stages:

```mermaid
graph LR
    subgraph "Node Execution"
        IN[Input Data] --> EXPR[Expression Resolution]
        EXPR --> VALID[Validation]
        VALID --> EXEC[Node Logic]
        EXEC --> TRANS[Output Transform]
        TRANS --> OUT[Output Data]
    end

    subgraph "Data Types"
        JSON[JSON Data]
        BINARY[Binary Data]
        META[Metadata]
    end

    IN -.-> JSON
    IN -.-> BINARY
    OUT -.-> JSON
    OUT -.-> BINARY
    OUT -.-> META
```

## Data Storage Architecture

### Database Schema Overview

```mermaid
erDiagram
    WORKFLOW {
        string id PK
        string name
        json nodes
        json connections
        boolean active
        json settings
    }

    EXECUTION {
        string id PK
        string workflowId FK
        string status
        datetime startedAt
        datetime stoppedAt
        string mode
    }

    EXECUTION_DATA {
        string executionId PK,FK
        json data
        string workflowData
    }

    CREDENTIALS {
        string id PK
        string name
        string type
        string data_encrypted
    }

    WEBHOOK {
        string id PK
        string workflowId FK
        string node
        string httpMethod
        string path
    }

    WORKFLOW ||--o{ EXECUTION : has
    EXECUTION ||--|| EXECUTION_DATA : contains
    WORKFLOW ||--o{ WEBHOOK : defines
    WORKFLOW }o--o{ CREDENTIALS : uses
```

### Data Types

#### 1. Workflow Data
- **Storage**: JSON in database
- **Contains**: Node definitions, connections, settings
- **Size**: Typically 10KB-1MB

#### 2. Execution Data
- **Storage**: Separate execution_data table
- **Contains**: Input/output for each node
- **Retention**: Configurable (default: 14 days)
- **Pruning**: Automatic based on age/count

#### 3. Binary Data
- **Storage Options**:
  - File system (default)
  - S3/MinIO
  - Database (not recommended)
- **Reference**: Stored as pointers in execution data
- **Cleanup**: Linked to execution lifecycle

```mermaid
graph TD
    subgraph "Binary Data Storage"
        EX[Execution Data] --> REF[Binary Reference]
        REF --> FS[File System]
        REF --> S3[S3 Bucket]
        REF --> DB[(Database BLOB)]
    end

    subgraph "Configuration"
        MODE[BINARY_DATA_MODE]
        MODE -->|filesystem| FS
        MODE -->|s3| S3
        MODE -->|database| DB
    end
```

## Execution Flow Patterns

### 1. Manual Execution

```mermaid
sequenceDiagram
    participant UI as Editor UI
    participant BE as Backend API
    participant ENG as Execution Engine
    participant DB as Database

    UI->>BE: POST /workflows/{id}/run
    BE->>DB: Create Execution
    BE->>ENG: Execute(runData, pinData)

    loop Process Nodes
        ENG->>ENG: Resolve Expressions
        ENG->>ENG: Execute Node
        ENG->>DB: Save Progress
        ENG-->>UI: SSE Progress Update
    end

    ENG->>DB: Save Final Result
    ENG->>BE: Return Execution
    BE->>UI: Send Complete Result
```

### 2. Trigger-Based Execution

```mermaid
sequenceDiagram
    participant EXT as External Service
    participant WH as Webhook Handler
    participant Q as Queue (if queue mode)
    participant ENG as Execution Engine
    participant DB as Database

    EXT->>WH: HTTP Request
    WH->>WH: Validate Request
    WH->>DB: Find Workflow

    alt Queue Mode
        WH->>Q: Queue Execution
        Q->>ENG: Assign to Worker
    else Regular Mode
        WH->>ENG: Direct Execute
    end

    ENG->>DB: Create Execution
    ENG->>ENG: Process Workflow
    ENG->>DB: Save Results

    alt Response Required
        ENG->>WH: Return Data
        WH->>EXT: HTTP Response
    end
```

### 3. Sub-workflow Execution

```mermaid
graph TD
    subgraph "Parent Workflow"
        PN1[Node 1] --> SUB[Execute Workflow Node]
        SUB --> PN2[Node 3]
    end

    subgraph "Sub-workflow"
        SN1[Start] --> SN2[Process]
        SN2 --> SN3[End]
    end

    SUB -.-> SN1
    SN3 -.-> SUB

    subgraph "Data Flow"
        INPUT[Parent Data] --> SUB
        SUB --> OUTPUT[Combined Result]
    end
```

## Expression Resolution

n8n's expression engine resolves data references during execution:

```mermaid
graph LR
    subgraph "Expression Types"
        SIMPLE["{{ $json.field }}"]
        COMPLEX["{{ $node['HTTP'].json.data[0].id }}"]
        JS["{{ Math.random() * 100 }}"]
    end

    subgraph "Resolution Context"
        NODE[Current Node]
        PREV[Previous Nodes]
        ENV[Environment]
        VARS[Variables]
    end

    SIMPLE --> NODE
    COMPLEX --> PREV
    JS --> ENV
    JS --> VARS
```

### Data Access Patterns

```typescript
// Current node input
{{ $json }}              // Current item
{{ $input.all() }}       // All input items
{{ $input.first() }}     // First input item
{{ $input.last() }}      // Last input item
{{ $input.item }}        // Current item (alias)

// Previous node data
{{ $node["NodeName"].json }}     // Specific node output
{{ $("NodeName").all() }}        // All items from node
{{ $("NodeName").first() }}      // First item from node
{{ $("NodeName").last() }}       // Last item from node

// Execution context
{{ $execution.id }}              // Execution ID
{{ $workflow.id }}               // Workflow ID
{{ $workflow.name }}             // Workflow name
{{ $now }}                       // Current timestamp
{{ $today }}                     // Today's date

// Environment and variables
{{ $env.VARIABLE_NAME }}         // Environment variable
{{ $vars.myVariable }}           // n8n variable
```

## Data Security

For comprehensive security architecture including authentication, authorization, and encryption details, see [System Overview - Security Architecture](./system-overview.md#security-architecture).

### Key Security Measures in Data Flow

1. **Credential Encryption**: AES-256-GCM encryption at rest
2. **Data Privacy**: Execution data sanitization and PII handling
3. **Access Control**: RBAC via `@n8n/permissions` package
4. **Audit Trail**: Event-based logging for data access

## Performance Optimization

### Data Batching

```mermaid
graph LR
    subgraph "Batch Processing"
        ITEMS[1000 Items] --> BATCH[Batch Node]
        BATCH --> B1[Batch 1<br/>100 items]
        BATCH --> B2[Batch 2<br/>100 items]
        BATCH --> BN[Batch N<br/>100 items]
    end

    subgraph "Benefits"
        MEM[Lower Memory]
        PARALLEL[Parallel Processing]
        ERROR[Error Isolation]
    end

    BATCH --> MEM
    BATCH --> PARALLEL
    BATCH --> ERROR
```

### Streaming Support

For large data processing, n8n supports streaming:

```mermaid
sequenceDiagram
    participant Source as Data Source
    participant Node as n8n Node
    participant Buffer as Buffer
    participant Dest as Destination

    Source->>Node: Stream Start
    loop Data Chunks
        Source->>Node: Data Chunk
        Node->>Buffer: Process Chunk
        Buffer->>Dest: Write Chunk
    end
    Source->>Node: Stream End
    Node->>Dest: Finalize
```

## Data Retention and Cleanup

### Execution Data Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created: Execution Starts
    Created --> Running: Processing
    Running --> Success: Completed
    Running --> Error: Failed
    Success --> Pruned: After X Days
    Error --> Pruned: After Y Days
    Pruned --> [*]: Deleted

    note right of Pruned
        Configurable via:
        - EXECUTIONS_DATA_MAX_AGE
        - EXECUTIONS_DATA_SAVE_ON_SUCCESS
        - EXECUTIONS_DATA_SAVE_ON_ERROR
    end
```

### Pruning Configuration

```bash
# Execution data retention
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
EXECUTIONS_DATA_SAVE_ON_PROGRESS=true
EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true

# Pruning settings
EXECUTIONS_DATA_MAX_AGE=336  # 14 days in hours
EXECUTIONS_DATA_PRUNE_MAX_COUNT=10000
```

## Monitoring Data Flow

### Key Metrics

1. **Execution Metrics**:
   - Start/completion rate
   - Average execution time
   - Data volume processed
   - Error rates

2. **Storage Metrics**:
   - Database size growth
   - Binary data storage usage
   - Execution retention counts

3. **Performance Metrics**:
   - Node execution times
   - Expression resolution time
   - Data transformation overhead

### Data Flow Debugging

Use these tools to debug data flow issues:

1. **Execution History**: View input/output for each node
2. **Expression Editor**: Test expressions with live data
3. **Binary Data Inspector**: Examine file contents
4. **Workflow Variables**: Track data through execution

## Best Practices

### 1. Data Minimization
- Process only required fields
- Remove unnecessary data early in workflow
- Use pagination for large datasets

### 2. Error Handling
- Implement error branches
- Use try-catch nodes for critical operations
- Log errors appropriately

### 3. Performance
- Batch operations when possible
- Use streaming for large files
- Implement caching where appropriate

### 4. Security
- Never log credentials
- Sanitize user input
- Use webhook authentication
- Implement rate limiting

### 5. Monitoring
- Set up execution alerts
- Monitor storage growth
- Track performance metrics
- Regular cleanup schedules
