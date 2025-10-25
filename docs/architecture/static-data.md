# Static Data

> **⚠️ Notice**: This document is a placeholder and needs to be completed.

## Overview

Static data in n8n provides a mechanism for nodes to persist information between executions. This allows workflows to maintain state, track progress, and store temporary data that survives across multiple runs of the same workflow.

## TODO: Document the Following

### Core Concepts

#### What is Static Data?
- Definition and purpose
- How it differs from regular workflow data
- Persistence mechanisms (memory vs database)
- Scope and lifecycle

#### Storage Mechanisms
- In-memory storage for development
- Database persistence for production
- Redis/external storage options
- Data serialization and deserialization

### Usage Patterns

#### Common Use Cases
- Tracking last processed item in polling triggers
- Maintaining counters and statistics
- Storing temporary authentication tokens
- Caching expensive computations
- Rate limiting and throttling
- Deduplication tracking

#### API and Access Methods
- `getWorkflowStaticData()` method
- Data structure and types
- Reading and writing patterns
- Atomic operations and race conditions

### Implementation Details

#### Per-Node Static Data
- How data is scoped to individual nodes
- Node ID and versioning considerations
- Data migration on node updates

#### Per-Workflow Static Data
- Workflow-level static data
- Sharing data between nodes
- Access control and permissions

### Best Practices

#### Data Management
- Size limitations and quotas
- Cleanup strategies
- Data expiration policies
- Performance considerations

#### Security Considerations
- What should not be stored in static data
- Encryption for sensitive data
- Access control between workflows

### Examples

#### Polling Trigger with State
```typescript
async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    const staticData = this.getWorkflowStaticData('node');
    const lastId = staticData.lastId as string || '0';

    const newItems = await this.helpers.httpRequest({
        url: `https://api.example.com/items?since=${lastId}`,
    });

    if (newItems.length) {
        staticData.lastId = newItems[newItems.length - 1].id;
        return [this.helpers.returnJsonArray(newItems)];
    }

    return null;
}
```

#### Rate Limiting Implementation
```typescript
const staticData = this.getWorkflowStaticData('node');
const now = Date.now();
const lastRun = staticData.lastRun as number || 0;
const minInterval = 60000; // 1 minute

if (now - lastRun < minInterval) {
    return null; // Skip this execution
}

staticData.lastRun = now;
```

#### Counter Management
```typescript
const staticData = this.getWorkflowStaticData('node');
staticData.counter = (staticData.counter as number || 0) + 1;
staticData.processedItems = staticData.processedItems || [];
staticData.processedItems.push(itemId);
```

### Advanced Topics

#### Static Data in Sub-workflows
- Inheritance and isolation
- Parent-child data sharing
- Execution context considerations

#### Static Data in Scaled Deployments
- Multi-instance synchronization
- Distributed locking mechanisms
- Consistency guarantees

#### Debugging and Monitoring
- Viewing static data in the UI
- Logging and auditing
- Troubleshooting common issues

## Key Questions to Answer

1. How is static data persisted across n8n restarts?
2. What are the size limits for static data?
3. How does static data behave in webhook vs manual execution modes?
4. Can static data be shared between different workflows?
5. What happens to static data when a node is deleted or renamed?
6. How is static data handled during workflow import/export?
7. What are the performance implications of large static data objects?
8. How can static data be reset or cleared programmatically?

## Related Documentation

- [Node Execution Contexts](./node-execution-contexts.md) - Context APIs for accessing static data
- [Workflow Execution Engine](./workflow-execution-engine.md) - How static data fits into execution
- [Trigger Nodes](./trigger-nodes.md) - Common static data patterns in triggers

## Code Locations

- Static data interfaces: `/packages/workflow/src/Interfaces.ts`
- Storage implementation: `/packages/cli/src/WorkflowHelpers.ts`
- Database models: `/packages/cli/src/databases/entities/WorkflowStatistics.ts`
- Tests: Search for `getWorkflowStaticData` in test files
