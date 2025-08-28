# WebSocket & Real-time Features

> **⚠️ Notice**: This document was created by AI and not properly reviewed by the team yet.

## Overview

n8n uses WebSocket connections for real-time features including execution progress updates, collaborative editing, and server-to-client push notifications. This document covers the WebSocket architecture, event system, and real-time features implementation.

## TODO: Document the Following

### WebSocket Infrastructure

#### Push Connection Setup
- **Server**: `/packages/cli/src/push/`
- **Client**: `/packages/frontend/editor-ui/src/stores/pushConnection.store.ts`
- Connection lifecycle
- Authentication via JWT
- Reconnection strategies
- Connection pooling

#### Transport Layer
- WebSocket protocol
- Fallback to Server-Sent Events (SSE)
- Message format and encoding
- Compression strategies
- Keep-alive mechanisms

### Event System

#### Event Types

##### Execution Events
```typescript
type ExecutionPushMessage = {
  type: 'executionStarted' | 'executionFinished' | 'executionProgress';
  data: {
    executionId: string;
    workflowId: string;
    status: ExecutionStatus;
    data?: IRunExecutionData;
  };
}
```

##### Workflow Events
- workflowUpdated
- workflowDeleted
- workflowActivated/Deactivated

##### Collaboration Events
- userJoined/userLeft
- cursorMoved
- nodeSelected
- workflowSaved

##### System Events
- nodeUpdated (new versions)
- systemStatus
- broadcastMessage

### Push Service Architecture

#### PushService
- **Location**: `/packages/cli/src/push/push.service.ts`
- User connection management
- Room/channel concepts
- Message routing
- Broadcasting mechanisms

#### Connection Management
```typescript
interface UserConnection {
  userId: string;
  sessionId: string;
  ws: WebSocket;
  subscriptions: Set<string>;
}
```

### Real-time Features

#### Execution Progress

##### Live Execution Updates
- Node execution status
- Output data streaming
- Error reporting
- Progress indicators

##### Implementation
```typescript
// Backend
executionProgress.on('nodeExecuted', (data) => {
  pushService.sendToUsers('execution.progress', {
    executionId,
    nodeId,
    status,
    output
  });
});

// Frontend
pushConnection.on('execution.progress', (data) => {
  executionsStore.updateNodeExecutionStatus(data);
});
```

#### Collaborative Editing

##### User Presence
- Active user tracking
- Cursor position sync
- Selection highlighting
- Typing indicators

##### Conflict Resolution
- Operational transformation
- Last-write-wins for properties
- Locking mechanisms
- Merge strategies

##### Canvas Synchronization
- Node position updates
- Connection changes
- Real-time canvas state
- Viewport sharing

### Frontend Integration

#### PushConnection Store
- WebSocket state management
- Event listener registration
- Automatic reconnection
- Message queueing

#### Event Handling Patterns
```typescript
// Store subscription
pushConnection.addEventListener('workflowUpdated', (event) => {
  if (event.workflowId === currentWorkflowId) {
    workflowsStore.fetchWorkflow(event.workflowId);
  }
});
```

### Performance Optimization

#### Message Batching
- Aggregating updates
- Debouncing strategies
- Priority queues
- Rate limiting

#### Subscription Management
- Selective subscriptions
- Dynamic subscribe/unsubscribe
- Interest management
- Memory optimization

### Scaling Considerations

#### Horizontal Scaling
- Redis pub/sub for multi-instance
- Sticky sessions
- Session migration
- State synchronization

#### Load Balancing
- WebSocket-aware load balancers
- Connection distribution
- Health checks
- Graceful shutdown

### Error Handling

#### Connection Errors
- Network failures
- Authentication errors
- Timeout handling
- Reconnection backoff

#### Message Delivery
- Acknowledgment system
- Retry mechanisms
- Dead letter queues
- Ordering guarantees

### Security Considerations

#### Authentication
- Token validation per connection
- Session expiration
- Permission checking per event
- Rate limiting

#### Data Validation
- Message schema validation
- Input sanitization
- XSS prevention
- Size limits

### Monitoring and Debugging

#### Metrics
- Connection count
- Message throughput
- Latency measurements
- Error rates

#### Debugging Tools
- WebSocket frame inspection
- Event logging
- Connection state tracking
- Performance profiling

## Key Questions to Answer

1. How is authentication handled for WebSocket connections?
2. What's the failover mechanism for WebSocket failures?
3. How are messages routed to specific users/sessions?
4. What's the reconnection strategy and backoff algorithm?
5. How is collaborative editing conflict resolution implemented?
6. What are the scalability limits for concurrent connections?
7. How is message ordering guaranteed?
8. What monitoring is available for WebSocket health?

## Related Documentation

- [Frontend State Management](./frontend-state-management.md) - PushConnection store
- [Execution Modes](./execution-modes.md) - Queue mode implications
- [System Overview](./system-overview.md) - Real-time in architecture

## Code Locations to Explore

- `/packages/cli/src/push/` - Push service implementation
- `/packages/cli/src/collaboration/` - Collaboration features
- `/packages/frontend/editor-ui/src/stores/pushConnection.store.ts` - Client store
- `/packages/frontend/editor-ui/src/composables/usePushConnection/` - Push handlers
- `/packages/cli/src/websocket/` - WebSocket server setup
