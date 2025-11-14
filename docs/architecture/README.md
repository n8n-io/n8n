# n8n Architecture Documentation

> **⚠️ Notice**: This document was created by AI and not properly reviewed by the team yet.

This guide provides an overview of n8n's system design, components, architectural patterns and highlights important implementation details.

## 🚀 Quick Start

If you're new to n8n's architecture, start here:

1. **[System Overview](./system-overview.md)** - High-level architecture and core components
2. **[Execution Modes](./execution-modes.md)** - Understanding deployment options (Regular vs Queue mode)
3. **[Package Architecture](./package-architecture.md)** - Code organization and dependencies

## 📚 Documentation Structure

### Core Concepts

- **[System Overview](./system-overview.md)**
  - Core architecture principles
  - System components overview
  - Deployment modes comparison
  - Service architecture patterns

- **[Execution Modes](./execution-modes.md)**
  - Regular and Queue modes
  - [Queue Mode Architecture](./queue-mode.md) - Detailed queue mode implementation

- **[Package Architecture](./package-architecture.md)**
  - Monorepo structure
  - Package dependencies
  - Service patterns
  - Node system architecture
  - Frontend architecture

### Backend Architecture

- **[Node Execution Contexts](./node-execution-contexts.md)**
  - Execution context types
  - Available methods per context
  - Data transformation patterns
  - Context-specific features

- **[Task Runner](./task-runner.md)**
  - Isolated code execution architecture
  - Task broker and runner lifecycle
  - Security and module restrictions
  - Configuration and deployment

- TBD

### Frontend Architecture

- TBD

### Other Documentation

- **[Evaluation](./evaluation.md)**
  - Workflow testing framework
  - Performance evaluation
  - Quality metrics
- TBD
