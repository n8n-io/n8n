# Task Runner Architecture

> **⚠️ Notice**: This documentation was created by AI and not properly reviewed by the team yet.

## Overview

The task runner system provides isolated execution environments for JavaScript and Python code within n8n workflows. This architecture ensures security and resource isolation when executing user-provided code.

## TODO: Document the Following

### System Components
- Task Broker service (`TaskBrokerService`)
- Task Runner process (`TaskRunnerModule`)
- WebSocket communication layer
- Authentication and authorization

### Architecture
- Process isolation model
- Communication protocol between main process and runners
- Resource management and limits
- Security boundaries

### Key Features
- JavaScript and Python code execution
- Isolated process per execution
- Resource limits (CPU, memory)
- Secure communication via WebSocket
- Built-in helper functions access

### Implementation Details
- Location: `packages/@n8n/task-runner/`
- Key files:
  - `src/task-broker.service.ts`
  - `src/task-runner.ts`
  - `src/task-runner-module.ts`
- Integration with Code node

### Configuration
- Environment variables for task runner
- Resource limits configuration
- Security settings

### Security Considerations
- Process sandboxing
- Input/output sanitization
- Access control to n8n helpers
- Network isolation

## References
- Code node implementation: `packages/nodes-base/nodes/Code/`
- Task runner package: `packages/@n8n/task-runner/`
