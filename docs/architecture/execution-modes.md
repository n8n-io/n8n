# n8n Execution Modes

> **⚠️ Notice**: This documentation was created by AI and not properly reviewed by the team yet.

n8n supports two execution modes to accommodate various deployment scenarios, from simple single-instance setups to highly scalable distributed systems.

## Overview

n8n can run in two execution modes:
- **Regular Mode**: Single process handles everything (default)
- **Queue Mode**: Distributed processes with Redis-based job queue

These modes are configured via the `EXECUTIONS_MODE` environment variable:
```bash
# Regular mode (default)
EXECUTIONS_MODE=regular

# Queue mode
EXECUTIONS_MODE=queue
```

## Regular Mode

In regular mode, a single n8n process handles all responsibilities:

**Characteristics:**
- Single process architecture
- All functionality in one process
- Direct execution without queue overhead
- Simpler deployment and debugging
- Limited by single process resources

**When to Use:**
- Personal or small team deployments
- Low to medium workflow volume
- Development and testing environments
- When simplicity is prioritized over scalability

**Configuration:**
```bash
# Set execution mode (default is regular)
EXECUTIONS_MODE=regular

# Optional: Set concurrency limit
N8N_CONCURRENCY_PRODUCTION_LIMIT=5  # Default: -1 (unlimited)

# Start n8n
n8n start
```

## Queue Mode

Queue mode distributes n8n functionality across multiple specialized processes, enabling horizontal scaling and high availability.

**Characteristics:**
- Multi-process architecture
- Redis-based job queue (Bull)
- Horizontal scalability
- Process isolation for reliability
- Higher infrastructure complexity

**When to Use:**
- High workflow volume
- Need for high availability
- Horizontal scaling requirements
- Resource-intensive workflows
- Multi-tenant environments

### Process Types in Queue Mode

#### 1. Main Process (`n8n start`)

**Responsibilities:**
- Serve the editor UI (default port: 5678)
- Handle REST API requests
- Manage workflow activation/deactivation
- Queue workflow executions
- Handle test webhooks
- WebSocket connections for real-time updates

**Configuration:**
```bash
# Required: Enable queue mode
EXECUTIONS_MODE=queue

# Redis configuration
QUEUE_BULL_REDIS_HOST=localhost
QUEUE_BULL_REDIS_PORT=6379
QUEUE_BULL_REDIS_DB=0

# Optional: Redis authentication
QUEUE_BULL_REDIS_PASSWORD=yourpassword

# Start main process
n8n start
```

#### 2. Worker Process (`n8n worker`)

**Responsibilities:**
- Pull jobs from Redis queue
- Execute workflows
- Report execution progress and results
- Handle execution timeouts
- Process binary data

**Configuration:**
```bash
# Start worker with concurrency setting
n8n worker --concurrency=10

# Or use environment variable (overrides --concurrency flag)
N8N_CONCURRENCY_PRODUCTION_LIMIT=20 n8n worker
```

**Concurrency:**
- Default: 10 concurrent executions per worker
- Set via `--concurrency` flag or `N8N_CONCURRENCY_PRODUCTION_LIMIT`
- Each worker can process multiple executions simultaneously
- Scale horizontally by adding more worker processes

**Health Monitoring:**
```bash
# Enable worker health endpoints
QUEUE_HEALTH_CHECK_ACTIVE=true
QUEUE_HEALTH_CHECK_PORT=5678

# Health endpoints:
# GET /healthz - Basic health check
# GET /healthz/readiness - Database and Redis connectivity
```

#### 3. Webhook Process (`n8n webhook`)

**Responsibilities:**
- Handle production webhook requests
- Validate webhook signatures
- Queue webhook-triggered executions
- Minimal resource footprint

**Note:** Webhook process REQUIRES queue mode and will error if started in regular mode.

**Configuration:**
```bash
# Same Redis configuration as main process
EXECUTIONS_MODE=queue
QUEUE_BULL_REDIS_HOST=localhost

# Start webhook process
n8n webhook
```

**Benefits:**
- Isolates webhook handling from execution load
- Ensures webhook availability during high execution load
- Allows independent scaling of webhook capacity
- Smaller memory footprint than main process

## Architecture Comparison

### Regular Mode Architecture

```mermaid
graph TD
    subgraph "Single n8n Process"
        UI[Editor UI]
        API[REST API]
        WM[Workflow Manager]
        EE[Execution Engine]
        WH[Webhook Handler]
        AE[Active Executions]
    end

    subgraph "External"
        BROWSER[Browser]
        WEBHOOK[Webhook Sources]
    end

    subgraph "Storage"
        DB[(Database)]
        FS[File System]
    end

    BROWSER --> UI
    BROWSER --> API
    WEBHOOK --> WH

    API --> WM
    WM --> EE
    WH --> EE
    EE --> AE

    EE --> DB
    AE --> DB
    EE --> FS
```

**Execution Flow:**
1. Workflow triggered (manual, webhook, or schedule)
2. Execution registered in ActiveExecutions
3. WorkflowExecute processes nodes directly
4. Results saved to database
5. UI updated via polling or events

### Queue Mode Architecture

```mermaid
graph TB
    LB[Load Balancer]

    subgraph "Main Processes"
        M1[Main 1]
        M2[Main 2]
    end

    subgraph "Worker Pool"
        W1[Worker 1<br/>concurrency: 10]
        W2[Worker 2<br/>concurrency: 10]
        W3[Worker 3<br/>concurrency: 10]
    end

    subgraph "Webhook Processors"
        WH1[Webhook 1]
        WH2[Webhook 2]
    end

    subgraph "Redis"
        QUEUE[Bull Queue<br/>'bull:jobs']
        PUBSUB[Pub/Sub Channels]
    end

    subgraph "Storage"
        DB[(Database)]
        S3[Binary Data Storage]
    end

    LB --> M1
    LB --> M2

    M1 --> QUEUE
    M2 --> QUEUE

    WH1 --> QUEUE
    WH2 --> QUEUE

    QUEUE --> W1
    QUEUE --> W2
    QUEUE --> W3

    W1 --> DB
    W2 --> DB
    W3 --> DB

    M1 -.-> PUBSUB
    M2 -.-> PUBSUB
    W1 -.-> PUBSUB
    W2 -.-> PUBSUB
    W3 -.-> PUBSUB
```

**Execution Flow:**
1. Workflow triggered via main or webhook process
2. Job queued in Redis with execution data
3. Worker pulls job from queue
4. Worker executes workflow
5. Progress updates sent via Redis pub/sub
6. Results saved to database
7. Main process notifies UI via WebSocket

## Redis Configuration

### Basic Configuration

```bash
# Enable queue mode
EXECUTIONS_MODE=queue

# Redis connection
QUEUE_BULL_REDIS_HOST=localhost
QUEUE_BULL_REDIS_PORT=6379
QUEUE_BULL_REDIS_DB=0

# Authentication
QUEUE_BULL_REDIS_PASSWORD=yourpassword
QUEUE_BULL_REDIS_USERNAME=default  # Redis 6.0+

# TLS/SSL
QUEUE_BULL_REDIS_TLS=true

# Connection options
QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD=10000  # Max retry timeout (ms)
QUEUE_BULL_REDIS_DUALSTACK=true  # Enable IPv4/IPv6
```

### Redis Cluster Configuration

```bash
# Comma-separated list of cluster nodes
QUEUE_BULL_REDIS_CLUSTER_NODES=redis-1:6379,redis-2:6379,redis-3:6379
```

### Bull Queue Settings

```bash
# Queue key prefix in Redis
QUEUE_BULL_PREFIX=bull  # Results in keys like 'bull:jobs:*'

# Job processing settings
QUEUE_WORKER_LOCK_DURATION=30000      # Job lease time (ms)
QUEUE_WORKER_LOCK_RENEW_TIME=15000    # Lease renewal interval (ms)
QUEUE_WORKER_STALLED_INTERVAL=30000   # Check for stalled jobs (ms)
QUEUE_WORKER_MAX_STALLED_COUNT=1      # Max stalled job retries
```

## Job Queue Implementation

n8n uses Bull (Redis-based queue library) for job management. Jobs represent workflow executions that need to be processed.

### Job Structure

```typescript
interface JobData {
  executionId: string;
  loadStaticData: boolean;
}
```

### Job Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Queued: Job Created
    Queued --> Active: Worker Claims
    Active --> Completed: Success
    Active --> Failed: Error
    Active --> Stalled: Worker Crash
    Failed --> Queued: Retry (if < maxStalledCount)
    Stalled --> Queued: Recovery
    Completed --> [*]
    Failed --> [*]: Max Retries Reached
```

### Queue Features

1. **Stalled Job Recovery**: Jobs are marked as stalled if a worker crashes or fails to renew the lock
2. **Progress Updates**: Workers send real-time progress via Redis pub/sub
3. **Graceful Shutdown**: Workers wait for active executions to complete (configurable timeout)
4. **Queue Recovery**: Leader process periodically checks for orphaned executions
5. **Concurrency Control**: Each worker limits concurrent executions

## Process Communication

### Regular Mode
- Direct function calls within single process
- Shared memory for state
- Node.js EventEmitter for internal events
- No inter-process communication needed

### Queue Mode

Queue mode uses multiple communication channels:

1. **Bull Queue (Redis)**: Job distribution
2. **Redis Pub/Sub**: Real-time event broadcasting
3. **Database**: Persistent state and results
4. **WebSocket**: UI real-time updates

```mermaid
sequenceDiagram
    participant Main as Main/Webhook Process
    participant Redis as Redis
    participant Worker as Worker
    participant DB as Database

    Main->>DB: Create Execution Record
    Main->>Redis: Queue Job
    Note over Redis: Job in 'waiting' state

    Worker->>Redis: Poll for Jobs
    Redis->>Worker: Assign Job
    Note over Redis: Job in 'active' state

    Worker->>Redis: Publish Progress
    Redis->>Main: Progress Event (Pub/Sub)

    Worker->>DB: Save Execution Data
    Worker->>Redis: Mark Job Complete
    Redis->>Main: Completion Event (Pub/Sub)
```

### Pub/Sub Channels

n8n uses Redis pub/sub for:
- `n8n.commands`: Command broadcasting (e.g., reload credentials)
- `n8n.worker-status`: Worker health updates
- Execution progress events

## Scaling and Performance

### Regular Mode Performance

**Concurrency Control:**
```bash
# Limit concurrent executions (default: -1 = unlimited)
N8N_CONCURRENCY_PRODUCTION_LIMIT=5
```

**Considerations:**
- All executions share process memory
- CPU-bound workflows can block UI
- Memory leaks affect entire application
- Single process limits total throughput

### Queue Mode Scaling

**Horizontal Scaling Strategy:**

1. **Monitor Queue Metrics:**
   - Queue depth (pending jobs)
   - Job wait time
   - Worker utilization
   - Failed job rate

2. **Scale Workers:**
   ```bash
   # Add more workers when queue depth increases
   n8n worker --concurrency=10  # Worker 1
   n8n worker --concurrency=10  # Worker 2
   n8n worker --concurrency=20  # Worker 3 (higher capacity)
   ```

3. **Scale Main Processes:**
   - Use load balancer for multiple main processes
   - Ensures UI/API availability
   - Distributes webhook load

4. **Scale Webhook Processes:**
   - Add webhook processes for high webhook volume
   - Lightweight processes with minimal overhead

## Queue Recovery and Reliability

### Stalled Job Recovery

When workers crash or lose connection, jobs can become stalled:

```bash
# Configure stalled job handling
QUEUE_WORKER_STALLED_INTERVAL=30000   # Check interval (ms)
QUEUE_WORKER_MAX_STALLED_COUNT=1      # Max recovery attempts
```

### Execution Recovery

The leader main process periodically checks for orphaned executions:

```bash
# Queue recovery settings
N8N_EXECUTIONS_QUEUE_RECOVERY_INTERVAL=180  # Minutes between checks
N8N_EXECUTIONS_QUEUE_RECOVERY_BATCH=100     # Executions per batch
```

### Graceful Shutdown

```bash
# Worker shutdown timeout (seconds)
N8N_GRACEFUL_SHUTDOWN_TIMEOUT=30

# Deprecated (still works but use above instead)
QUEUE_WORKER_TIMEOUT=30
```

During shutdown:
1. Worker stops accepting new jobs
2. Waits for active executions to complete
3. Force terminates after timeout

## Best Practices

### Regular Mode

1. **Resource Management:**
   - Set `N8N_CONCURRENCY_PRODUCTION_LIMIT` to prevent overload
   - Configure execution timeouts: `EXECUTIONS_TIMEOUT=300`
   - Enable execution pruning to manage database size
   - Monitor process memory usage

2. **Performance:**
   - Use external binary data storage for large files
   - Avoid CPU-intensive operations in webhook nodes
   - Consider queue mode if experiencing performance issues

### Queue Mode

1. **Redis Configuration:**
   - **Enable persistence**: Use AOF (append-only file) or RDB snapshots
   - **Set memory policy**: `maxmemory-policy allkeys-lru`
   - **Configure connection pooling**: Bull handles this automatically
   - **Monitor memory usage**: Set alerts for high memory usage

2. **Worker Deployment:**
   ```bash
   # Recommended starting configuration
   CPU_CORES=$(nproc)
   n8n worker --concurrency=$CPU_CORES
   ```
   - Deploy workers on separate machines from Redis
   - Use container orchestration (Kubernetes, ECS) for auto-scaling
   - Set resource limits to prevent memory leaks from affecting other processes

3. **High Availability:**
   - Run multiple main processes behind a load balancer
   - Use Redis Sentinel or Redis Cluster for Redis HA
   - Deploy workers across availability zones
   - Implement health checks and auto-restart

4. **Monitoring:**
   - **Queue metrics**: Depth, wait time, processing time
   - **Worker metrics**: CPU, memory, active jobs
   - **Redis metrics**: Memory, connections, operations/sec
   - **Application metrics**: Execution success/failure rates

## Migration Between Modes

### Regular to Queue Mode

1. **Prepare Infrastructure:**
   ```bash
   # Install Redis (example for Ubuntu)
   sudo apt-get install redis-server

   # Configure Redis persistence
   redis-cli CONFIG SET appendonly yes
   ```

2. **Update Configuration:**
   ```bash
   # Set environment variables
   export EXECUTIONS_MODE=queue
   export QUEUE_BULL_REDIS_HOST=localhost
   export QUEUE_BULL_REDIS_PORT=6379
   ```

3. **Deploy Processes:**
   ```bash
   # Stop existing regular mode process
   systemctl stop n8n

   # Start main process
   n8n start &

   # Start worker(s)
   n8n worker --concurrency=10 &

   # Optional: Start webhook process
   n8n webhook &
   ```

### Queue to Regular Mode

1. **Verify Queue is Empty:**
   ```bash
   # Check Redis for pending jobs
   redis-cli KEYS "bull:jobs:*"
   ```

2. **Stop Queue Mode Processes:**
   ```bash
   # Stop all workers and webhook processes
   pkill -f "n8n worker"
   pkill -f "n8n webhook"
   ```

3. **Update Configuration:**
   ```bash
   export EXECUTIONS_MODE=regular
   # Remove Redis configuration variables
   unset QUEUE_BULL_REDIS_HOST
   unset QUEUE_BULL_REDIS_PORT
   ```

4. **Start Regular Mode:**
   ```bash
   n8n start
   ```

## Troubleshooting

### Common Issues

#### Jobs Not Processing

1. **Check Redis Connection:**
   ```bash
   # Test Redis connectivity
   redis-cli -h $QUEUE_BULL_REDIS_HOST ping

   # Check for queued jobs
   redis-cli LLEN bull:jobs:wait
   redis-cli LLEN bull:jobs:active
   ```

2. **Verify Worker Status:**
   ```bash
   # Check worker logs
   journalctl -u n8n-worker -f

   # Check worker health endpoint (if enabled)
   curl http://worker-host:5678/healthz
   ```

3. **Debug Job Data:**
   ```bash
   # Inspect job details in Redis
   redis-cli --raw HGETALL bull:jobs:1
   ```

#### Stalled Executions

1. **Check for Stalled Jobs:**
   ```bash
   redis-cli ZRANGE bull:jobs:stalled 0 -1
   ```

2. **Manual Recovery:**
   - Stalled jobs are automatically recovered based on `QUEUE_WORKER_MAX_STALLED_COUNT`
   - To force recovery, restart workers

#### High Memory Usage

1. **Worker Memory:**
   - Reduce `--concurrency` value
   - Enable execution pruning
   - Use external binary data storage:
     ```bash
     N8N_DEFAULT_BINARY_DATA_MODE=s3
     ```

2. **Redis Memory:**
   ```bash
   # Check Redis memory usage
   redis-cli INFO memory

   # Set memory limit
   redis-cli CONFIG SET maxmemory 2gb
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```

#### Performance Issues

1. **Queue Bottlenecks:**
   ```bash
   # Monitor queue depth over time
   watch -n 1 'redis-cli LLEN bull:jobs:wait'

   # Check job processing time
   redis-cli --raw HGET bull:jobs:1 processedOn
   redis-cli --raw HGET bull:jobs:1 finishedOn
   ```

2. **Worker Optimization:**
   - Increase worker concurrency if CPU/memory allows
   - Add more worker processes
   - Distribute workers geographically closer to data sources

### Debugging Tips

1. **Enable Debug Logging:**
   ```bash
   N8N_LOG_LEVEL=debug
   N8N_LOG_OUTPUT=console
   ```

2. **Monitor Bull Queue Events:**
   - Workers emit events for job lifecycle
   - Main process logs queue operations
   - Check Redis for job data and state

3. **Use Queue Monitoring Tools:**
   - Bull Dashboard (for development)
   - Redis monitoring tools
   - Custom metrics via Prometheus
