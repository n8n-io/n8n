# n8n System Architecture Overview

## Introduction

n8n is a workflow automation platform built with a modular, scalable architecture. This document provides a high-level overview of the system components and their interactions.

## Core Architecture Principles

- **Modular Design**: Functionality is separated into focused packages
- **Dependency Injection**: Uses TypeDI-based container for loose coupling
- **Event-Driven**: Components communicate through event buses
- **Repository Pattern**: Clean separation between business logic and data access
- **Scalable Execution**: Supports both single-process and distributed queue modes

## System Components

### Core Packages

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[editor-ui<br/>Vue.js Application]
        DS[design-system<br/>UI Components]
        COMP[composables<br/>Vue Composables]
        STORES[stores<br/>Pinia State Management]
    end
    
    subgraph "Backend Layer"
        CLI[cli<br/>Main Server & Commands]
        CORE[core<br/>Execution Engine]
        WF[workflow<br/>Workflow Logic]
        NODES[nodes-base<br/>Built-in Nodes]
    end
    
    subgraph "Infrastructure Layer"
        DB[db<br/>Database Abstraction]
        DI[di<br/>Dependency Injection]
        CONFIG[config<br/>Configuration]
        PERM[permissions<br/>RBAC System]
    end
    
    UI --> CLI
    CLI --> CORE
    CLI --> WF
    CLI --> DB
    CORE --> WF
    NODES --> CORE
    NODES --> WF
    
    CLI --> DI
    CORE --> DI
    DB --> DI
```

### Package Responsibilities

| Package | Purpose | Key Components |
|---------|---------|----------------|
| `cli` | Main server process, API endpoints, command-line interface | Server, Controllers, Services, Commands |
| `core` | Workflow execution engine, node handling, credentials | WorkflowExecute, NodeExecuteFunctions |
| `workflow` | Workflow data structures, expression evaluation | Workflow class, Expression parser |
| `nodes-base` | Collection of built-in nodes | 400+ node implementations |
| `editor-ui` | Web-based workflow editor | Vue.js components, stores, views |
| `db` | Database abstraction and repositories | TypeORM entities, repositories |

## Deployment Modes

n8n supports two primary deployment modes to accommodate different scale and reliability requirements:

### 1. Regular Mode (Default)

Single process handles all responsibilities:

```mermaid
graph LR
    subgraph "n8n Main Process"
        API[API Server<br/>:5678]
        UI[UI Server<br/>:5678]
        EXEC[Execution Engine]
        WH[Webhook Handler]
        CRON[Cron Jobs]
    end
    
    subgraph "Storage"
        DB[(Database)]
        FS[File System<br/>Binary Data]
    end
    
    CLIENT[Browser] --> UI
    WEBHOOK[External Services] --> WH
    API --> DB
    EXEC --> DB
    EXEC --> FS
```

**Characteristics:**
- Simple deployment
- All components in one process
- Suitable for small to medium workloads
- Port 5678 serves both API and UI

### 2. Queue Mode (Scalable)

Distributed architecture with specialized processes:

```mermaid
graph TB
    subgraph "Main Process"
        MAIN_API[API Server]
        MAIN_UI[UI Server]
        MAIN_ORCH[Orchestrator]
    end
    
    subgraph "Worker Processes"
        W1[Worker 1]
        W2[Worker 2]
        WN[Worker N]
    end
    
    subgraph "Webhook Process"
        WH_HANDLER[Webhook Handler]
        WH_QUEUE[Queue Publisher]
    end
    
    subgraph "Infrastructure"
        REDIS[(Redis<br/>Job Queue)]
        DB[(Database)]
        S3[S3/MinIO<br/>Binary Data]
    end
    
    CLIENT[Browser] --> MAIN_UI
    EXTERNAL[External Services] --> WH_HANDLER
    
    MAIN_ORCH --> REDIS
    WH_QUEUE --> REDIS
    REDIS --> W1
    REDIS --> W2
    REDIS --> WN
    
    W1 --> DB
    W2 --> DB
    WN --> DB
    
    W1 --> S3
    W2 --> S3
    WN --> S3
```

**Characteristics:**
- Horizontally scalable workers
- Fault tolerance
- Better resource utilization
- Suitable for high-volume production workloads

## Service Architecture

n8n uses a service-oriented architecture within the main process:

```mermaid
graph TD
    subgraph "Controllers Layer"
        WFC[WorkflowController]
        EC[ExecutionController]
        CC[CredentialsController]
        UC[UserController]
    end
    
    subgraph "Services Layer"
        WFS[WorkflowService]
        ES[ExecutionService]
        CS[CredentialsService]
        AS[AuthService]
        PS[ProjectService]
        CMS[CommunityPackagesService]
    end
    
    subgraph "Repository Layer"
        WFR[WorkflowRepository]
        ER[ExecutionRepository]
        CR[CredentialsRepository]
        UR[UserRepository]
    end
    
    WFC --> WFS
    EC --> ES
    CC --> CS
    UC --> AS
    
    WFS --> WFR
    ES --> ER
    CS --> CR
    AS --> UR
```

### Key Services

1. **WorkflowService**: Manages workflow CRUD operations, sharing, and activation
2. **ExecutionService**: Handles workflow execution lifecycle, recovery, and pruning
3. **CredentialsService**: Manages encrypted credentials and access control
4. **AuthService**: Handles authentication, JWT tokens, and session management
5. **ProjectService**: Manages team collaboration and resource organization

## Data Flow

### Execution Request Flow

```mermaid
sequenceDiagram
    participant C as Client/Trigger
    participant API as API Controller
    participant WS as WorkflowService
    participant EX as ExecutionService
    participant Q as Queue/Runner
    participant DB as Database
    
    C->>API: Start Execution
    API->>WS: Validate Workflow
    WS->>EX: Create Execution
    EX->>DB: Store Initial State
    EX->>Q: Queue/Run Job
    Q-->>EX: Execution Updates
    EX->>DB: Update Progress
    Q->>EX: Completion
    EX->>DB: Final State
    EX->>API: Result
    API->>C: Response
```

## Configuration & Environment

n8n uses a layered configuration system:

1. **Default Config**: Built-in defaults in `@n8n/config`
2. **Environment Variables**: Override defaults (e.g., `N8N_*`)
3. **Config Files**: JSON/JS configuration files
4. **Runtime Config**: Dynamic settings stored in database

## Security Architecture

- **Authentication**: JWT-based with refresh tokens
- **Authorization**: RBAC with projects and resource permissions
- **Credentials**: AES-256 encryption at rest
- **API Security**: API key support, rate limiting
- **Network**: HTTPS support, webhook signature validation

## Monitoring & Observability

- **Logging**: Winston-based structured logging
- **Metrics**: Prometheus metrics endpoint
- **Health Checks**: `/healthz` endpoints for each process type
- **Event Bus**: Internal event system for audit and monitoring

## Next Steps

- [Execution Modes](./execution-modes.md) - Detailed explanation of each deployment mode
- [Data Flow](./data-flow.md) - How data moves through the system
- [Package Architecture](./package-architecture.md) - Deep dive into package structure