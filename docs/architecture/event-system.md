# Event System Architecture

> **⚠️ Notice**: This document was created by AI and not properly reviewed by the team yet.

## Overview

n8n implements an event-driven architecture for internal communication, telemetry, and audit logging. The event system enables loose coupling between components and provides a foundation for monitoring and observability.

## TODO: Document the Following

### Core Components
- `EventService` - Central event dispatcher
- Event relay system for different purposes
- Message Event Bus for workflow events
- Pub/Sub system for multi-instance coordination

### Event Types
- Workflow events (started, completed, failed)
- Node events (executed, failed)
- User events (login, logout, actions)
- System events (startup, shutdown, errors)
- Telemetry events

### Architecture
- Event emitters and listeners pattern
- Event relay mechanism
- Integration with external systems
- Buffering and persistence

### Key Features
- Asynchronous event processing
- Event filtering and routing
- Telemetry collection
- Audit trail generation
- Webhook notifications

### Implementation Details
- Location: `packages/cli/src/events/`
- Key files:
  - `event.service.ts`
  - `event-relay.ts`
  - Event type definitions
- Message Event Bus: `packages/cli/src/eventbus/`

### Use Cases
- Workflow execution tracking
- User activity monitoring
- System health monitoring
- External integrations
- Compliance and audit

### Configuration
- Event retention policies
- Telemetry settings
- Event filtering rules

## References
- Event Service: `packages/cli/src/events/event.service.ts`
- Message Event Bus: `packages/cli/src/eventbus/`
- Telemetry: `packages/cli/src/telemetry/`
