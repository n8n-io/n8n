# Log Streaming Module

## Overview

The Log Streaming module provides enterprise-grade event logging that forwards n8n internal events to external destinations in real-time. This allows organizations to centralize logs, integrate with monitoring solutions, and maintain audit trails.

**Key Features:**

- Real-time event streaming to external systems
- Multiple destination types (Webhook, Syslog, Sentry)
- Circuit breaker pattern for resilient delivery
- Event filtering by subscription patterns
- Optional payload anonymization
- Multi-instance coordination via pub/sub

**License Requirement:** `feat:logStreaming`

## Architecture

### Component Flow

```text
┌──────────────┐
│ n8n Workflow │  emits events
│  Execution   │─────────────────┐
└──────────────┘                 │
                                 ▼
                    ┌────────────────────────┐
                    │   MessageEventBus      │
                    │   (Event Publisher)    │
                    └────────────┬───────────┘
                                 │ message event
                                 ▼
           ┌─────────────────────────────────────┐
           │  LogStreamingDestinationService     │
           │  - Filters by subscription          │
           │  - Routes to destinations           │
           │  - Handles confirmations            │
           └──────────┬──────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   ┌────────┐    ┌────────┐   ┌────────┐
   │Webhook │    │ Sentry │   │Syslog  │
   │  Dest  │    │  Dest  │   │  Dest  │
   └────┬───┘    └────┬───┘   └────┬───┘
        │             │             │
        └─────────────┴─────────────┘
                      │ with Circuit Breaker
                      ▼
              External Systems
```

### Key Components

#### 1. LogStreamingModule ([log-streaming.module.ts](log-streaming.module.ts))

- Entry point and initialization
- Registers database entities
- Runs on main, worker, and webhook process types

#### 2. LogStreamingDestinationService ([log-streaming-destination.service.ts](log-streaming-destination.service.ts))

- Manages destination lifecycle (add, remove, load from DB)
- Listens to MessageEventBus and routes messages
- Coordinates with worker processes via pub/sub
- Handles circuit breaker failures gracefully

#### 3. MessageEventBusDestination (Base Class)

Abstract base for all destination types with:

- Event subscription checking via `sendMessage()`
- License validation automatically enforced
- Circuit breaker integration
- Serialization/deserialization
- Credential management

**Key Method - `sendMessage()`:** Entry point for all messages. Automatically handles:

- License verification (`license.isLogStreamingEnabled()`)
- Event subscription filtering (`hasSubscribedToEvent()`)
- Circuit breaker protection
- Delegates to `receiveFromEventBus()` for actual sending

**Circuit Breaker:** Protects against cascading failures with configurable thresholds for timeout, max failures, and recovery testing.

#### 4. EventBusController ([log-streaming.controller.ts](log-streaming.controller.ts))

REST API endpoints:

- `GET /eventbus/eventnames` - List available events
- `GET /eventbus/destination` - Get destination(s)
- `POST /eventbus/destination` - Create destination
- `DELETE /eventbus/destination` - Delete destination
- `GET /eventbus/testmessage` - Test destination

### Database Schema

**Table: `event_destinations`**

```typescript
{
  id: string;              // UUID
  destination: JSON;       // Serialized destination config
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

## Existing Destinations

### Webhook

Sends events to HTTP/HTTPS endpoints with authentication support, custom headers, and response validation.

### Sentry

Forwards events to Sentry with automatic severity detection and release tracking.

### Syslog

Sends events to syslog servers in RFC 5424 format via TCP/UDP/TLS.

## Adding a New Destination

### 1. Define Type and Interface

Add to `packages/workflow/src/Interfaces.ts`:

```typescript
export enum MessageEventBusDestinationTypeNames {
  // ... existing types
  myNewType = 'myNewType',
}

export interface MessageEventBusDestinationMyNewTypeOptions
  extends MessageEventBusDestinationOptions {
  __type: MessageEventBusDestinationTypeNames.myNewType;
  // Add your config properties
  host: string;
  apiKey?: string;
}
```

### 2. Implement Destination Class

Create `destinations/message-event-bus-destination-mynewtype.ee.ts`:

```typescript
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type { MessageWithCallback } from '@/eventbus/message-event-bus/message-event-bus';
import { MessageEventBusDestination } from './message-event-bus-destination.ee';

export class MessageEventBusDestinationMyNewType extends MessageEventBusDestination {
  host: string;

  constructor(eventBusInstance, options) {
    super(eventBusInstance, options);
    this.host = options.host;
    this.__type = MessageEventBusDestinationTypeNames.myNewType;
    // Initialize your client
  }

  async receiveFromEventBus(emitterPayload: MessageWithCallback): Promise<boolean> {
    const { msg, confirmCallback } = emitterPayload;

    try {
      const payload = this.anonymizeAuditMessages ? msg.anonymize() : msg.payload;

      // Send to your destination
      // await this.client.send({ ... });

      confirmCallback(msg, { id: this.id, name: this.label });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send to ${this.label}`, { error });
      throw error; // Triggers circuit breaker
    }
  }

  serialize() {
    return { ...super.serialize(), host: this.host };
  }

  static deserialize(eventBusInstance, data) {
    if (data.__type === MessageEventBusDestinationTypeNames.myNewType) {
      return new MessageEventBusDestinationMyNewType(eventBusInstance, data);
    }
    return null;
  }
}
```

#### Understanding the Confirm Callback

The `confirmCallback` is a critical part of the message delivery flow. **You must call it when your destination successfully sends a message.**

**Why it's important:**

- **Tracks delivery status**: Notifies the MessageEventBus that the message was successfully delivered
- **Enables monitoring**: Allows n8n to track which destinations received which events
- **Supports reliability**: Future implementations may use this for retry logic or delivery guarantees

**When to call it:**

```typescript
// ✅ DO: Call after successful delivery
await this.client.send(payload);
confirmCallback(msg, { id: this.id, name: this.label });

// ❌ DON'T: Call before sending (message might fail)
confirmCallback(msg, { id: this.id, name: this.label });
await this.client.send(payload); // What if this fails?

// ❌ DON'T: Forget to call it (delivery won't be tracked)
await this.client.send(payload);
return true; // Missing confirmCallback!
```

**Parameters:**

- `msg`: The original event message being confirmed
- `source`: Object identifying your destination
  - `id`: Your destination's unique ID (`this.id`)
  - `name`: Human-readable label (`this.label`)

### 3. Register Destination

**In [destinations/message-event-bus-destination-from-db.ts](destinations/message-event-bus-destination-from-db.ts):**

```typescript
case MessageEventBusDestinationTypeNames.myNewType:
  return MessageEventBusDestinationMyNewType.deserialize(eventBusInstance, destinationData);
```

**In [log-streaming.controller.ts](log-streaming.controller.ts):**

```typescript
case MessageEventBusDestinationTypeNames.myNewType:
  result = await this.destinationService.addDestination(
    new MessageEventBusDestinationMyNewType(this.eventBus, body),
  );
  break;
```

### 4. Add API Validation

Update `packages/@n8n/api-types` with Zod schema and add to `CreateDestinationDto` discriminated union.

### 5. Write Tests

Create `destinations/__tests__/message-event-bus-destination-mynewtype.ee.test.ts` following existing test patterns.

## Event Subscription

Subscribe to events using glob patterns:

```typescript
subscribedEvents: [
  '*',                    // All events
  'n8n.workflow.*',       // All workflow events
  'n8n.workflow.failed',  // Specific event
  'n8n.audit.*',          // All audit events
]
```

Get available events: `GET /eventbus/eventnames`

## Best Practices

1. **Always throw errors** in `receiveFromEventBus()` to trigger circuit breaker
2. **Use the logger** for debugging and error tracking
3. **Implement cleanup** in the `close()` method
4. **Validate config** in the constructor
5. **Handle credentials securely** using CredentialsHelper
6. **Use connection pooling** for network destinations
7. **Respect anonymization** via `this.anonymizeAuditMessages`
8. **Serialize minimally** to reduce database storage

## Testing

1. **Unit tests**: Test serialization, error handling, message formatting
2. **Integration test**: `GET /eventbus/testmessage?id=<destination-id>`
3. **Manual test**: Create workflow and verify event delivery

## Troubleshooting

### Destination not receiving events

- Verify `enabled: true` and subscription patterns match
- Check license is active
- Review circuit breaker state in logs

### Circuit breaker keeps opening

- Check destination service availability
- Verify network connectivity
- Consider increasing `maxFailures` or `failureWindow`

### Events delayed/dropped

- Monitor circuit breaker metrics
- Check destination processing time
- Verify worker process coordination

## References

- Circuit Breaker: [packages/cli/src/utils/circuit-breaker.ts](../../utils/circuit-breaker.ts)
- Event Bus: [packages/cli/src/eventbus/](../../eventbus/)
- Webhook Example: [destinations/message-event-bus-destination-webhook.ee.ts](destinations/message-event-bus-destination-webhook.ee.ts)
