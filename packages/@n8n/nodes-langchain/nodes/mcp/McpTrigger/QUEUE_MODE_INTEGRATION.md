# MCP Tools Queue Mode Integration Guide

## Problem Statement

In n8n's Queue Mode, MCP tools fail with errors:
- `Tool node does not have supplyData method`
- `Worker tool execution timeout`

**Root Cause:** When workflow executions are queued to Redis/Bull, tool objects (LangChain Tool instances) are JSON serialized. This strips all JavaScript function references, including the critical `supplyData` and `invoke` methods. Workers receive invalid tool objects without methods.

## Solution Architecture

The solution implements an **execution strategy pattern** with **RPC-based tool invocation**:

### Direct Mode (Single Instance)
- Tools execute directly in the same process
- No serialization needed
- Uses `DirectExecutionStrategy`

### Queue Mode (Distributed)
- Workers create proxy tools that delegate to the main instance
- Tool invocation requests sent via Redis pubsub
- Main instance executes tools and returns results
- Uses `QueuedExecutionStrategy` with `PendingCallsManager`

## Implementation Status

### ✅ Completed Components

1. **Execution Strategies** (`execution/`)
   - `DirectExecutionStrategy.ts` - Direct tool execution
   - `QueuedExecutionStrategy.ts` - RPC-based proxy tool execution
   - `PendingCallsManager.ts` - Manages async tool invocation requests/responses

2. **Coordinator** (`ToolExecutionCoordinator.ts`)
   - Detects deployment mode (direct vs queue)
   - Instantiates appropriate strategy
   - Provides pubsub communication interface

3. **MCP Server Integration** (`McpServer.ts`)
   - Added `setExecutionStrategy()` method
   - Tools are prepared using execution strategy
   - Default: `DirectExecutionStrategy`

### 🚧 Integration Required

The following integration points need to be wired up with n8n's infrastructure:

## Integration Steps

### Step 1: Wire Up Pubsub Communication

The `ToolExecutionCoordinator` has placeholder methods that need to be connected to n8n's pubsub system:

**Location:** `ToolExecutionCoordinator.ts`

**Methods to implement:**

```typescript
// Worker: Send tool invocation request to main
private async sendToolInvocationToMain(request: ToolInvocationRequest): Promise<void> {
    // TODO: Replace with actual pubsub implementation
    await this.pubsubService.publish('mcp:tool-invocation:request', request);
}

// Worker: Listen for responses from main
private setupWorkerResponseListener(): void {
    this.pubsubService.subscribe('mcp:tool-invocation:response', 
        (response: ToolInvocationResponse) => {
            if (this.executionStrategy instanceof QueuedExecutionStrategy) {
                this.executionStrategy.handleResponse(response);
            }
        }
    );
}

// Main: Listen for requests from workers
private setupMainRequestListener(): void {
    this.pubsubService.subscribe('mcp:tool-invocation:request', 
        async (request: ToolInvocationRequest) => {
            await this.handleWorkerToolInvocation(request);
        }
    );
}

// Main: Send response back to worker
private async sendToolInvocationResponse(response: ToolInvocationResponse): Promise<void> {
    await this.pubsubService.publish('mcp:tool-invocation:response', response);
}
```

**Required Changes:**

1. Inject `PubSubService` (or equivalent) into `ToolExecutionCoordinator` constructor
2. Replace TODO placeholders with actual pubsub calls
3. Register the coordinator as a service in n8n's DI container

### Step 2: Detect Queue Mode in Scaling Service

**Location:** `packages/cli/src/scaling/scaling.service.ts`

**Add to `ScalingService` class:**

```typescript
import { Container } from '@n8n/di';
import { McpServerManager } from '@n8n/nodes-langchain/nodes/mcp/McpTrigger/McpServer';
import { QueuedExecutionStrategy } from '@n8n/nodes-langchain/nodes/mcp/McpTrigger/execution';

// In ScalingService.setupQueue() or setupWorker()
async setupQueue() {
    // ... existing queue setup code ...

    // Configure MCP server for queue mode
    this.configureQueueModeForMcp();
    
    this.logger.debug('Queue setup completed');
}

private configureQueueModeForMcp(): void {
    try {
        const mcpServerManager = McpServerManager.instance(this.logger);
        
        // Create queued execution strategy with pubsub communication
        const queuedStrategy = new QueuedExecutionStrategy(
            this.logger,
            this.sendToolInvocationViaPubsub.bind(this),
            undefined, // sessionId
            30000 // timeout
        );
        
        // Set the strategy on MCP server
        mcpServerManager.setExecutionStrategy(queuedStrategy);
        
        this.logger.info('MCP server configured for queue mode');
    } catch (error) {
        this.logger.error('Failed to configure MCP queue mode', { error });
    }
}

private async sendToolInvocationViaPubsub(request: ToolInvocationRequest): Promise<void> {
    // Use existing pubsub infrastructure to send request
    // Implementation depends on n8n's pubsub service
}
```

### Step 3: Set Up Main Instance Listeners

**Location:** `packages/cli/src/scaling/scaling.service.ts` (main instance)

**Add main instance tool invocation handler:**

```typescript
// In ScalingService constructor or initialization
private setupMcpToolInvocationHandler(): void {
    if (this.instanceSettings.instanceType !== 'main') return;
    
    // Listen for tool invocation requests from workers
    this.pubsubService.subscribe('mcp:tool-invocation:request', 
        async (request: ToolInvocationRequest) => {
            await this.handleMcpToolInvocation(request);
        }
    );
    
    this.logger.debug('MCP tool invocation handler set up on main instance');
}

private async handleMcpToolInvocation(request: ToolInvocationRequest): Promise<void> {
    const { callId, toolName, args, sessionId } = request;
    
    try {
        const mcpServerManager = McpServerManager.instance(this.logger);
        const tools = sessionId ? mcpServerManager.tools[sessionId] : [];
        
        if (!tools || tools.length === 0) {
            throw new Error(`No tools found for session ${sessionId}`);
        }
        
        const tool = tools.find((t) => t.name === toolName);
        if (!tool) {
            throw new Error(`Tool '${toolName}' not found`);
        }
        
        // Execute tool on main instance
        const result = await tool.invoke(args);
        const resultString = typeof result === 'object' ? JSON.stringify(result) : String(result);
        
        // Send response back to worker
        await this.pubsubService.publish('mcp:tool-invocation:response', {
            callId,
            success: true,
            result: resultString,
        });
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        await this.pubsubService.publish('mcp:tool-invocation:response', {
            callId,
            success: false,
            error: errorMessage,
        });
    }
}
```

### Step 4: Alternative Simpler Approach (If Pubsub Not Available)

If n8n's pubsub infrastructure is not easily accessible, you can use Bull queue progress messages:

**Worker sends request:**
```typescript
await job.progress({
    kind: 'mcp-tool-invocation-request',
    callId: 'unique-id',
    toolName: 'calculator',
    args: { expression: '2+2' },
});
```

**Main instance listens:**
```typescript
this.queue.on('global:progress', (jobId: JobId, msg: unknown) => {
    if (msg.kind === 'mcp-tool-invocation-request') {
        await this.handleMcpToolInvocation(msg);
    }
});
```

## Testing the Integration

### Test 1: Direct Mode (Baseline)
1. Run n8n in single-instance mode
2. Create workflow with MCP Trigger + Agent + MCP tools
3. Execute workflow
4. ✅ Should work (already working)

### Test 2: Queue Mode (New)
1. Start n8n with queue mode enabled (`N8N_EXECUTIONS_MODE=queue`)
2. Start main instance and worker instance
3. Create workflow with MCP Trigger + Agent + MCP tools
4. Execute workflow on worker
5. ✅ Should work with new implementation

### Debugging

Enable debug logging:
```bash
N8N_LOG_LEVEL=debug
```

Look for:
- "MCP Server execution strategy set to QueuedExecutionStrategy"
- "Created pending call {callId} for tool {toolName}"
- "Worker sending tool invocation request: {callId}"
- "Main instance handling tool invocation: {callId}"
- "Resolved pending call {callId}"

## Performance Considerations

- **Latency:** Queue mode adds RPC overhead (Redis roundtrip)
- **Timeout:** Default 30 seconds for tool invocation
- **Concurrency:** Multiple pending calls supported
- **Cleanup:** Pending calls cleared on shutdown

## Rollback Plan

If issues occur, revert by:
1. Remove `setExecutionStrategy()` call in scaling.service.ts
2. McpServerManager will default to DirectExecutionStrategy
3. Queue mode will fail as before, but direct mode unaffected

## Summary

This solution enables MCP tools to work in n8n's Queue Mode by:
- Detecting deployment mode automatically
- Creating proxy tools that delegate to main instance
- Using RPC pattern to cross the queue serialization boundary
- Maintaining backward compatibility with direct mode

The integration requires wiring up pubsub communication but preserves existing n8n architecture patterns.
