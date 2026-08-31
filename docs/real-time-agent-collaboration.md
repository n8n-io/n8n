# Real-Time Agent Collaboration

## Overview

This feature enables real-time collaborative editing of AI agents in n8n, allowing multiple users to simultaneously work on the same agent configuration with live presence tracking. Future enhancements will include conflict resolution mechanisms.

## Features

### Core Capabilities

- **Multi-user Editing**: Multiple users can edit the same agent simultaneously
- **Real-time Presence**: See who else is currently editing an agent
- **Cursor Tracking**: Live cursor positions of other users
- **Change Broadcasting**: Configuration changes are instantly propagated to all users
- **Session Management**: Users can join/leave collaboration sessions

### Future Enhancements

- **Conflict Resolution**: Built-in mechanisms to handle concurrent edits (planned)
- **CRDT Integration**: Leverage existing `@n8n/crdt` package for conflict resolution (planned)

### Technical Implementation

#### Backend Architecture

The backend implementation leverages n8n's existing infrastructure:

- **WebSocket Push Service**: Uses existing WebSocket infrastructure for real-time communication
- **Agent Collaboration Service**: Manages collaboration sessions and presence tracking
- **REST API Controller**: Provides endpoints for session management
- **Type-Safe Messages**: Structured message types for collaboration events
- **DTO Validation**: Zod-based request validation for type safety

#### Frontend Architecture

The frontend provides real-time collaboration features:

- **Collaboration Composable**: Vue 3 composable for managing collaboration state
- **Presence Indicators**: UI components showing active users
- **Real-time Updates**: Live updates via WebSocket connections
- **Optimistic UI**: Instant feedback for user actions

## API Reference

### REST Endpoints

#### Join Agent Session
```http
POST /agent-collaboration/:agentId/join
```

**Request Body:**
```json
{
  "userName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "agentId": "agent-123",
  "userId": "user-456",
  "userName": "John Doe",
  "activeUsers": ["user-456", "user-789"]
}
```

#### Leave Agent Session
```http
DELETE /agent-collaboration/:agentId/leave
```

**Response:**
```json
{
  "success": true,
  "agentId": "agent-123",
  "userId": "user-456"
}
```

#### Get Active Users
```http
GET /agent-collaboration/:agentId/users
```

**Response:**
```json
{
  "agentId": "agent-123",
  "userCount": 2,
  "activeUsers": ["user-456", "user-789"]
}
```

#### Update Cursor Position
```http
POST /agent-collaboration/:agentId/cursor
```

**Request Body:**
```json
{
  "x": 150,
  "y": 250
}
```

**Response:**
```json
{
  "success": true,
  "agentId": "agent-123",
  "userId": "user-456",
  "position": {
    "x": 150,
    "y": 250
  }
}
```

#### Get Cursor Positions
```http
GET /agent-collaboration/:agentId/cursors
```

**Response:**
```json
{
  "agentId": "agent-123",
  "cursors": {
    "user-456": {
      "x": 150,
      "y": 250
    },
    "user-789": {
      "x": 300,
      "y": 400
    }
  }
}
```

#### Get User Status
```http
GET /agent-collaboration/:agentId/status
```

**Response:**
```json
{
  "agentId": "agent-123",
  "userId": "user-456",
  "isActive": true,
  "userCount": 2
}
```

### WebSocket Messages

#### Agent Presence Update
```json
{
  "type": "agent-presence",
  "agentId": "agent-123",
  "payload": {
    "type": "user-joined",
    "userId": "user-789",
    "userName": "Jane Doe",
    "timestamp": 1234567890
  }
}
```

#### Cursor Update
```json
{
  "type": "agent-presence",
  "agentId": "agent-123",
  "payload": {
    "type": "cursor-update",
    "userId": "user-789",
    "position": {
      "x": 300,
      "y": 400
    },
    "timestamp": 1234567890
  }
}
```

#### Agent Configuration Change
```json
{
  "type": "agent-collaboration",
  "agentId": "agent-123",
  "payload": {
    "type": "config-update",
    "data": {
      "name": "Updated Agent Name"
    },
    "userId": "user-789"
  }
}
```

## Usage Examples

### Frontend Integration

```vue
<script setup lang="ts">
import { useAgentCollaboration } from '@/features/agents/composables/useAgentCollaboration';
import { useUsersStore } from '@/stores/users.store';

const usersStore = useUsersStore();

const {
  isActive,
  activeUsers,
  userCount,
  hasActiveUsers,
  joinSession,
  leaveSession,
  updateCursorPosition,
} = useAgentCollaboration('agent-123');

// Join collaboration session on mount
onMounted(() => {
  joinSession();
});

// Update cursor position on mouse move
function handleMouseMove(event: MouseEvent) {
  updateCursorPosition(event.clientX, event.clientY);
}

// Leave session on unmount
onUnmounted(() => {
  leaveSession();
});
</script>

<template>
  <div v-if="hasActiveUsers" class="collaboration-indicator">
    <AgentCollaborationPresence
      :active-users="activeUsers"
      :user-count="userCount"
      :current-user-id="usersStore.currentUserId"
    />
  </div>
</template>
```

### Backend Integration

```typescript
import { AgentCollaborationService } from '@/services/agent-collaboration.service';

@Service()
export class MyService {
  constructor(
    private readonly collaborationService: AgentCollaborationService,
  ) {}

  async updateAgentConfig(agentId: string, config: unknown, userId: string) {
    // Update configuration
    await this.saveAgentConfig(agentId, config);

    // Broadcast change to all active users
    await this.collaborationService.broadcastAgentChange(agentId, {
      type: 'config-update',
      data: config,
      userId,
    });
  }
}
```

## Architecture Decisions

### Leverage Existing Infrastructure

The implementation intentionally builds on n8n's existing infrastructure:

- **WebSocket Push Service**: Reuses the established WebSocket communication layer
- **TypeScript Patterns**: Follows n8n's strict typing conventions
- **Service Pattern**: Uses dependency injection and service architecture
- **Future CRDT Integration**: Planned for integration with existing `@n8n/crdt` package

### Gradual Enhancement

The current implementation provides a solid foundation for future enhancements:

- **Phase 1**: Basic presence tracking and change broadcasting
- **Phase 2**: CRDT-based conflict resolution using existing infrastructure
- **Phase 3**: Advanced features like offline support and conflict resolution UI

### Security Considerations

- **Authorization**: All endpoints require proper project scope authorization
- **User Validation**: Only authorized users can join collaboration sessions
- **Message Validation**: All incoming messages are type-checked and validated
- **Session Isolation**: Each agent has isolated collaboration sessions

## Performance Considerations

### Scalability

- **In-Memory State**: Current implementation uses in-memory state for presence tracking
- **Broadcasting**: Changes are broadcast only to active users on specific agents
- **Connection Management**: Leverages existing WebSocket connection pooling

### Future Optimizations

- **Redis Integration**: For distributed deployments, Redis could be used for presence state
- **Message Batching**: Multiple changes could be batched for efficiency
- **Delta Updates**: Only send changed data rather than full configurations

## Testing

### Unit Tests

Comprehensive unit tests cover:

- Service methods (join, leave, cursor updates)
- Message handling and broadcasting
- User presence tracking
- Error handling

### Integration Tests

Integration tests verify:

- WebSocket message flow
- API endpoint functionality
- Multi-user scenarios
- Presence tracking and cleanup
- Future: Conflict resolution (planned)

## Future Enhancements

### Planned Features

1. **CRDT Integration**: Full CRDT-based conflict resolution using `@n8n/crdt`
2. **Conflict Resolution UI**: Visual interface for resolving concurrent edits
3. **Offline Support**: Local editing with sync when reconnected
4. **History/Undo**: Track changes and enable undo functionality
5. **Advanced Presence**: Show what specific fields users are editing

### Technical Debt

- Move from polling to pure WebSocket message handling
- Add Redis backend for distributed deployments
- Implement proper CRDT document synchronization
- Add comprehensive E2E tests

## Contributing

When contributing to this feature:

1. Follow n8n's coding conventions and TypeScript best practices
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure backward compatibility with existing features
5. Test with multiple concurrent users

## License

This feature is part of n8n and follows the same license terms.