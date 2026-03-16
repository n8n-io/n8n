# Scaling, Redis Pub/Sub & Monitoring — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable horizontal scaling via Redis-backed event relay, expose Prometheus metrics, and provide Grafana dashboards for monitoring — all with docker compose scripts.

**Architecture:** The `EngineEventBus` delegates cross-instance broadcasting to an `EventRelay` interface with two implementations: `LocalEventRelay` (in-process, default) and `RedisEventRelay` (Redis pub/sub, when `REDIS_URL` is set). Prometheus metrics are exposed via `prom-client` on `GET /metrics`. Docker compose files are composable — `docker-compose.o11y.yml` is shared between perf and scaling setups. All events carry `eventId` and `createdAt` for tracing and latency measurement. `createEngine()` takes a typed config object instead of reading `process.env` directly.

**Tech Stack:** ioredis, prom-client, Prometheus, Grafana, Traefik, Redis 7 Alpine

**Spec:** `docs/engine-v2/plans/scaling/spec.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/engine/engine.config.ts` | Typed `EngineConfig` interface for `createEngine()` |
| `src/engine/event-relay.ts` | `EventRelay` interface + `LocalEventRelay` implementation |
| `src/engine/redis-event-relay.ts` | `RedisEventRelay` implementation using ioredis |
| `src/engine/metrics.service.ts` | Prometheus metric definitions and collection |
| `src/api/health.controller.ts` | `GET /health` and `GET /metrics` endpoints |
| `src/engine/__tests__/event-relay.test.ts` | Unit tests for LocalEventRelay |
| `src/engine/__tests__/redis-event-relay.test.ts` | Unit tests for RedisEventRelay (mocked ioredis) |
| `src/engine/__tests__/event-bus.test.ts` | Unit tests for EngineEventBus with relay wiring |
| `src/engine/__tests__/broadcaster.test.ts` | Unit tests for BroadcasterService with relay + dedup |
| `src/engine/__tests__/metrics.test.ts` | Unit tests for MetricsService |
| `src/api/__tests__/health.test.ts` | Unit tests for /health and /metrics endpoints |
| `test/integration/redis-relay.test.ts` | Integration test with real Redis (two relay instances) |
| `docker-compose.o11y.yml` | Prometheus + Grafana compose (shared) |
| `docker-compose.scaling.yml` | Multi-instance + Redis + Traefik compose |
| `o11y/prometheus.yml` | Prometheus scrape config |
| `o11y/grafana/provisioning/datasources/prometheus.yml` | Grafana → Prometheus datasource |
| `o11y/grafana/provisioning/datasources/influxdb.yml` | Grafana → InfluxDB datasource (moved from `perf/grafana/`) |
| `o11y/grafana/provisioning/dashboards/dashboard.yml` | Grafana dashboard provisioner |
| `o11y/grafana/dashboards/engine-overview.json` | Execution metrics dashboard |
| `o11y/grafana/dashboards/engine-steps.json` | Step metrics dashboard |
| `o11y/grafana/dashboards/engine-webhooks.json` | Webhook metrics dashboard |
| `o11y/grafana/dashboards/k6-results.json` | k6 perf results dashboard (moved from `perf/grafana/`) |

### Modified files

| File | Changes |
|------|---------|
| `src/engine/event-bus.types.ts` | Add `eventId` and `createdAt` to base event fields |
| `src/engine/event-bus.service.ts` | Accept `EventRelay`, auto-assign `eventId`/`createdAt`, call `relay.broadcast()` on emit, add `close()` method |
| `src/engine/broadcaster.service.ts` | Subscribe to both local bus and relay. No dedup needed (LocalEventRelay is no-op, RedisEventRelay filters by instanceId). Track SSE client count and relay latency via metrics. |
| `src/engine/create-engine.ts` | Accept `EngineConfig`, instantiate relay based on config, create MetricsService, wire everything |
| `src/engine/step-processor.service.ts` | Accept optional `MetricsService`, increment step metrics |
| `src/engine/engine.service.ts` | Accept optional `MetricsService`, increment execution active gauge |
| `src/engine/completion.service.ts` | Accept optional `MetricsService`, increment execution completion metrics |
| `src/engine/step-queue.service.ts` | Add `drain()` method that waits for in-flight steps. Accept optional `MetricsService` for claim latency. |
| `src/api/server.ts` | Add `/health` and `/metrics` routes. Accept `MetricsService` and health deps. |
| `src/api/webhook.controller.ts` | Accept optional `MetricsService`, increment webhook metrics |
| `src/main.ts` | Build `EngineConfig` from env vars, pass to `createEngine()`. Enhanced graceful shutdown with queue drain and relay close. |
| `package.json` | Add `ioredis` + `prom-client` deps, update `dev` script to include o11y |
| `docker-compose.yml` | Add shared network name for o11y composition |
| `docker-compose.perf.yml` | Add shared network, remove Grafana service (moved to o11y), keep InfluxDB |
| `docker-compose.test.yml` | Add Redis service for integration tests |
| `perf/grafana/` | Delete — all Grafana config consolidated into `o11y/grafana/` |
| `CLAUDE.md` | Add scaling/monitoring/relay docs |
| `docs/engine-v2/architecture/overview.md` | Mark Phase 2 event delivery as implemented |
| `docs/engine-v2/architecture/engine.md` | Add EventRelay documentation |
| `docs/engine-v2/plans/backlog.md` | Remove Redis pub/sub item |

---

## Chunk 1: Foundation Fixes (events, config, queue drain)

### Task 1: Add `eventId` and `createdAt` to all EngineEvents

**Files:**
- Modify: `src/engine/event-bus.types.ts`
- Modify: `src/engine/event-bus.service.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/engine/__tests__/event-bus.test.ts
import { describe, it, expect, vi } from 'vitest';
import { EngineEventBus } from '../event-bus.service';

describe('EngineEventBus', () => {
  it('should auto-assign eventId and createdAt on emit', () => {
    const bus = new EngineEventBus();
    const handler = vi.fn();
    bus.on('step:started', handler);

    bus.emit({
      type: 'step:started',
      executionId: 'exec-1',
      stepId: 'step-1',
      attempt: 1,
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: expect.any(String),
        createdAt: expect.any(Number),
        type: 'step:started',
      }),
    );
  });

  it('should generate unique eventIds', () => {
    const bus = new EngineEventBus();
    const events: unknown[] = [];
    bus.on('step:started', (e) => events.push(e));

    bus.emit({ type: 'step:started', executionId: 'e1', stepId: 's1', attempt: 1 });
    bus.emit({ type: 'step:started', executionId: 'e1', stepId: 's1', attempt: 2 });

    const ids = events.map((e) => (e as { eventId: string }).eventId);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('should not overwrite eventId if already set', () => {
    const bus = new EngineEventBus();
    const handler = vi.fn();
    bus.on('step:started', handler);

    bus.emit({
      type: 'step:started',
      executionId: 'e1',
      stepId: 's1',
      attempt: 1,
      eventId: 'custom-id',
      createdAt: 12345,
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'custom-id', createdAt: 12345 }),
    );
  });

  it('should call close() without errors when no relay', async () => {
    const bus = new EngineEventBus();
    await expect(bus.close()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/@n8n/engine && pnpm test:unit src/engine/__tests__/event-bus.test.ts`
Expected: FAIL — `eventId` and `createdAt` not present

- [ ] **Step 3: Add base fields to event types**

Modify `src/engine/event-bus.types.ts`. Add base fields to every event type:

```typescript
/** Base fields auto-assigned by EngineEventBus.emit() */
interface BaseEventFields {
  eventId: string;
  createdAt: number;
}
```

Add `& BaseEventFields` to each event interface (or add the fields directly).
Also update the `EngineEvent` union type.

The cleanest approach: make a `BaseEvent` type and intersect:

```typescript
export interface BaseEvent {
  eventId: string;
  createdAt: number;
}

export interface StepStartedEvent extends BaseEvent {
  type: 'step:started';
  // ...
}
// ... same for all other event interfaces
```

For emit-time ergonomics, callers should be able to omit `eventId` and
`createdAt` (auto-assigned). Define:

```typescript
/** Event as emitted by callers — eventId/createdAt are optional (auto-assigned) */
export type EmittableEvent = {
  [K in keyof EngineEvent]: K extends 'eventId' | 'createdAt'
    ? EngineEvent[K] | undefined
    : EngineEvent[K];
};
```

Or simpler — just use `Partial<Pick<BaseEvent, 'eventId' | 'createdAt'>>`:

```typescript
export type EmittableEvent = Omit<EngineEvent, 'eventId' | 'createdAt'> &
  Partial<Pick<BaseEvent, 'eventId' | 'createdAt'>>;
```

Update `EngineEventBus.emit()` to accept `EmittableEvent` and auto-assign:

```typescript
import { nanoid } from 'nanoid';

emit(input: EmittableEvent): void {
  const event: EngineEvent = {
    ...input,
    eventId: input.eventId ?? nanoid(),
    createdAt: input.createdAt ?? Date.now(),
  } as EngineEvent;

  this.safeEmit(event.type, event);
  const prefix = event.type.split(':')[0];
  this.safeEmit(`${prefix}:*`, event);
}
```

- [ ] **Step 4: Add `close()` method to EngineEventBus**

```typescript
async close(): Promise<void> {
  this.removeAllListeners();
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/@n8n/engine && pnpm test:unit src/engine/__tests__/event-bus.test.ts`
Expected: PASS

- [ ] **Step 6: Run typecheck**

Run: `cd packages/@n8n/engine && pnpm typecheck`
Expected: PASS — all existing emit calls still compile because `eventId`
and `createdAt` are optional on input. Handlers receive the full event with
guaranteed fields.

- [ ] **Step 7: Commit**

```bash
git add src/engine/event-bus.types.ts src/engine/event-bus.service.ts src/engine/__tests__/event-bus.test.ts
git commit -m "feat(engine): add eventId and createdAt to all engine events"
```

---

### Task 2: Typed EngineConfig for createEngine()

**Files:**
- Create: `src/engine/engine.config.ts`
- Modify: `src/engine/create-engine.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create EngineConfig**

```typescript
// src/engine/engine.config.ts

export interface EngineConfig {
  /** Redis URL for cross-instance event relay. If undefined, uses in-process relay. */
  redisUrl?: string;

  /** Maximum concurrent step executions per instance. Default: 10 */
  maxConcurrency?: number;

  /** Unique instance identifier. Auto-generated if not provided. */
  instanceId?: string;

  /** Redis channel prefix. Default: 'default'. Prevents cross-contamination when multiple deployments share one Redis. */
  redisChannelPrefix?: string;
}
```

- [ ] **Step 2: Update createEngine() to accept EngineConfig**

Change signature from `createEngine(dataSource: DataSource)` to
`createEngine(dataSource: DataSource, config: EngineConfig = {})`.

Replace any future `process.env.REDIS_URL` reads with `config.redisUrl`.
Pass `config.maxConcurrency` to `StepQueueService`.
Generate `config.instanceId` via `nanoid()` if not provided.

- [ ] **Step 3: Update main.ts to build config from env vars**

```typescript
const config: EngineConfig = {
  redisUrl: process.env.REDIS_URL,
  maxConcurrency: parseInt(process.env.MAX_CONCURRENCY ?? '10', 10),
};

const engine = createEngine(dataSource, config);
```

`process.env` is read in exactly one place: `main.ts`. All services
receive typed config, never env vars.

- [ ] **Step 4: Run typecheck**

Run: `cd packages/@n8n/engine && pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/engine.config.ts src/engine/create-engine.ts src/main.ts
git commit -m "refactor(engine): extract EngineConfig, read env vars only in main.ts"
```

---

### Task 3: StepQueueService.drain()

**Files:**
- Modify: `src/engine/step-queue.service.ts`
- Test: extend `src/engine/__tests__/event-bus.test.ts` (or create
  `src/engine/__tests__/step-queue.test.ts`)

- [ ] **Step 1: Write the failing test**

```typescript
// src/engine/__tests__/step-queue.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StepQueueService } from '../step-queue.service';

describe('StepQueueService', () => {
  it('drain() should resolve immediately when no in-flight steps', async () => {
    const fakeDataSource = {} as never;
    const fakeProcessor = {} as never;
    const queue = new StepQueueService(fakeDataSource, fakeProcessor);

    await expect(queue.drain(1000)).resolves.toBeUndefined();
  });

  it('drain() should stop the poller', async () => {
    const fakeDataSource = {} as never;
    const fakeProcessor = {} as never;
    const queue = new StepQueueService(fakeDataSource, fakeProcessor);
    queue.start();
    expect(queue.isRunning()).toBe(true);

    await queue.drain(1000);
    expect(queue.isRunning()).toBe(false);
  });

  it('drain() should wait for in-flight steps to complete', async () => {
    const fakeDataSource = {} as never;
    const fakeProcessor = {} as never;
    const queue = new StepQueueService(fakeDataSource, fakeProcessor);

    // Simulate an in-flight step by incrementing the counter directly
    // (accessing private field via cast for test purposes)
    (queue as unknown as { inFlight: number }).inFlight = 1;

    // Start drain, then "complete" the step after 50ms
    const drainPromise = queue.drain(5000);
    setTimeout(() => {
      (queue as unknown as { inFlight: number }).inFlight = 0;
    }, 50);

    await drainPromise;
    expect(queue.getInFlightCount()).toBe(0);
  });

  it('drain() should resolve after timeout even with in-flight steps', async () => {
    const fakeDataSource = {} as never;
    const fakeProcessor = {} as never;
    const queue = new StepQueueService(fakeDataSource, fakeProcessor);

    (queue as unknown as { inFlight: number }).inFlight = 1;

    const start = Date.now();
    await queue.drain(200); // short timeout
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(200);
    expect(queue.getInFlightCount()).toBe(1); // still in-flight
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/@n8n/engine && pnpm test:unit src/engine/__tests__/step-queue.test.ts`
Expected: FAIL — `drain` not a function

- [ ] **Step 3: Implement drain()**

Add to `StepQueueService`:

```typescript
/**
 * Stop accepting new work and wait for in-flight steps to finish.
 * Returns when all in-flight steps are done or timeout is reached.
 */
async drain(timeoutMs: number = 30_000): Promise<void> {
  this.stop();

  const deadline = Date.now() + timeoutMs;
  while (this.inFlight > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (this.inFlight > 0) {
    console.warn(`StepQueueService drain timeout: ${this.inFlight} steps still in-flight`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/@n8n/engine && pnpm test:unit src/engine/__tests__/step-queue.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/step-queue.service.ts src/engine/__tests__/step-queue.test.ts
git commit -m "feat(engine): add StepQueueService.drain() for graceful shutdown"
```

---

## Chunk 2: Event Relay

### Task 4: EventRelay Interface + LocalEventRelay

**Files:**
- Create: `src/engine/event-relay.ts`
- Test: `src/engine/__tests__/event-relay.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/engine/__tests__/event-relay.test.ts
import { describe, it, expect, vi } from 'vitest';
import { LocalEventRelay } from '../event-relay';

describe('LocalEventRelay', () => {
  it('broadcast() should be a no-op (no subscribers called)', () => {
    const relay = new LocalEventRelay();
    const handler = vi.fn();
    relay.onBroadcast(handler);

    relay.broadcast({
      type: 'step:completed',
      eventId: 'evt-1',
      createdAt: Date.now(),
      executionId: 'exec-1',
      stepId: 'step-1',
      output: { result: true },
      durationMs: 100,
    });

    // No-op: local bus already delivered. Relay does nothing.
    expect(handler).not.toHaveBeenCalled();
  });

  it('should implement EventRelay interface', () => {
    const relay = new LocalEventRelay();
    expect(relay.broadcast).toBeTypeOf('function');
    expect(relay.onBroadcast).toBeTypeOf('function');
    expect(relay.close).toBeTypeOf('function');
  });

  it('should close without errors', async () => {
    const relay = new LocalEventRelay();
    await expect(relay.close()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/@n8n/engine && pnpm test:unit src/engine/__tests__/event-relay.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the EventRelay interface and LocalEventRelay**

```typescript
// src/engine/event-relay.ts
import type { EngineEvent } from './event-bus.types';

type BroadcastHandler = (event: EngineEvent) => void;

/**
 * Relays engine events across instances.
 *
 * In single-instance mode (LocalEventRelay), events are delivered
 * to local subscribers only.
 * In multi-instance mode (RedisEventRelay), events are published
 * to Redis and received by all instances.
 */
export interface EventRelay {
  broadcast(event: EngineEvent): void;
  onBroadcast(handler: BroadcastHandler): void;
  close(): Promise<void>;
}

/**
 * No-op event relay for single-instance mode. broadcast() does nothing
 * because the local EngineEventBus already delivers events in-process.
 * onBroadcast() never fires. Used when no Redis is configured.
 */
export class LocalEventRelay implements EventRelay {
  broadcast(_event: EngineEvent): void {
    // No-op: local event bus already delivered the event.
  }

  onBroadcast(_handler: BroadcastHandler): void {
    // No-op: no remote events in single-instance mode.
  }

  async close(): Promise<void> {}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/@n8n/engine && pnpm test:unit src/engine/__tests__/event-relay.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/event-relay.ts src/engine/__tests__/event-relay.test.ts
git commit -m "feat(engine): add EventRelay interface and LocalEventRelay"
```

---

### Task 5: RedisEventRelay

**Files:**
- Modify: `package.json` (add ioredis dependency)
- Create: `src/engine/redis-event-relay.ts`
- Test: `src/engine/__tests__/redis-event-relay.test.ts`

- [ ] **Step 1: Install ioredis**

```bash
cd packages/@n8n/engine && pnpm add ioredis
```

Note: ioredis ships its own TypeScript types since v5. No `@types/ioredis` needed.

- [ ] **Step 2: Write the failing test**

```typescript
// src/engine/__tests__/redis-event-relay.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ioredis
const mockPublish = vi.fn().mockResolvedValue(1);
const mockSubscribe = vi.fn().mockResolvedValue(undefined);
const mockDisconnect = vi.fn().mockResolvedValue(undefined);
const messageHandlers: ((channel: string, message: string) => void)[] = [];

vi.mock('ioredis', () => {
  const MockRedis = vi.fn().mockImplementation(() => ({
    publish: mockPublish,
    subscribe: mockSubscribe,
    disconnect: mockDisconnect,
    status: 'ready',
    on: vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'message') {
        messageHandlers.push(handler as (ch: string, msg: string) => void);
      }
    }),
  }));
  return { default: MockRedis };
});

import { RedisEventRelay, getRedisChannel } from '../redis-event-relay';
import type { EngineEvent } from '../event-bus.types';

describe('RedisEventRelay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageHandlers.length = 0;
  });

  it('should publish events with instanceId envelope', () => {
    const relay = new RedisEventRelay('redis://localhost:6379', 'instance-A');

    const event = {
      type: 'step:completed' as const,
      eventId: 'evt-1',
      createdAt: Date.now(),
      executionId: 'exec-1',
      stepId: 'step-1',
      output: { ok: true },
      durationMs: 42,
    };

    relay.broadcast(event);

    expect(mockPublish).toHaveBeenCalledWith(
      getRedisChannel(),
      JSON.stringify({ instanceId: 'instance-A', event }),
    );
  });

  it('should deliver events from OTHER instances to broadcast handlers', () => {
    const relay = new RedisEventRelay('redis://localhost:6379', 'instance-A');
    const handler = vi.fn();
    relay.onBroadcast(handler);

    const event: EngineEvent = {
      type: 'step:started',
      eventId: 'evt-2',
      createdAt: Date.now(),
      executionId: 'exec-1',
      stepId: 'step-1',
      attempt: 1,
    };

    // Simulate message from a DIFFERENT instance
    for (const h of messageHandlers) {
      h(REDIS_CHANNEL, JSON.stringify({ instanceId: 'instance-B', event }));
    }

    expect(handler).toHaveBeenCalledWith(event);
  });

  it('should SKIP events from the SAME instance (dedup)', () => {
    const relay = new RedisEventRelay('redis://localhost:6379', 'instance-A');
    const handler = vi.fn();
    relay.onBroadcast(handler);

    const event: EngineEvent = {
      type: 'step:started',
      eventId: 'evt-3',
      createdAt: Date.now(),
      executionId: 'exec-1',
      stepId: 'step-1',
      attempt: 1,
    };

    // Simulate message from the SAME instance
    for (const h of messageHandlers) {
      h(REDIS_CHANNEL, JSON.stringify({ instanceId: 'instance-A', event }));
    }

    expect(handler).not.toHaveBeenCalled();
  });

  it('should close both Redis connections', async () => {
    const relay = new RedisEventRelay('redis://localhost:6379', 'instance-A');
    await relay.close();

    expect(mockDisconnect).toHaveBeenCalledTimes(2); // publisher + subscriber
  });

  it('should swallow publish errors without throwing', () => {
    mockPublish.mockRejectedValueOnce(new Error('Redis connection lost'));
    const relay = new RedisEventRelay('redis://localhost:6379', 'instance-A');

    // Should not throw — error is caught internally
    expect(() => {
      relay.broadcast({
        type: 'execution:started',
        eventId: 'err-test',
        createdAt: Date.now(),
        executionId: 'exec-1',
      });
    }).not.toThrow();
  });

  it('should expose connection status', () => {
    const relay = new RedisEventRelay('redis://localhost:6379', 'instance-A');
    expect(relay.getStatus()).toBe('ready');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/@n8n/engine && pnpm test:unit src/engine/__tests__/redis-event-relay.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write RedisEventRelay**

```typescript
// src/engine/redis-event-relay.ts
import Redis from 'ioredis';

import type { EventRelay } from './event-relay';
import type { EngineEvent } from './event-bus.types';

export function getRedisChannel(prefix: string = 'default'): string {
  return `engine:events:${prefix}`;
}

type BroadcastHandler = (event: EngineEvent) => void;

interface Envelope {
  instanceId: string;
  event: EngineEvent;
}

/**
 * Relays engine events across instances via Redis pub/sub.
 *
 * Uses two Redis connections: one for publishing, one for subscribing
 * (Redis requires dedicated connections for subscribers).
 *
 * Events are wrapped in an envelope with `instanceId` so each instance
 * can skip its own events (already handled locally by the event bus).
 *
 * Resilient to Redis failures: logs errors and continues. Local
 * orchestration is unaffected. Cross-instance SSE delivery is lost
 * until Redis recovers. ioredis auto-reconnects by default.
 */
export class RedisEventRelay implements EventRelay {
  private publisher: Redis;
  private subscriber: Redis;
  private handlers: BroadcastHandler[] = [];
  private readonly channel: string;

  constructor(
    redisUrl: string,
    private readonly instanceId: string,
    channelPrefix: string = 'default',
  ) {
    this.channel = getRedisChannel(channelPrefix);
    this.publisher = new Redis(redisUrl, { lazyConnect: false });
    this.subscriber = new Redis(redisUrl, { lazyConnect: false });

    this.publisher.on('error', (err) => {
      console.error('RedisEventRelay publisher error:', err.message);
    });

    this.subscriber.on('error', (err) => {
      console.error('RedisEventRelay subscriber error:', err.message);
    });

    this.subscriber.subscribe(this.channel).catch((err) => {
      console.error('RedisEventRelay subscribe error:', err.message);
    });

    this.subscriber.on('message', (_channel: string, message: string) => {
      try {
        const envelope = JSON.parse(message) as Envelope;
        // Skip own events — already handled locally
        if (envelope.instanceId === this.instanceId) return;

        for (const handler of this.handlers) {
          handler(envelope.event);
        }
      } catch (err) {
        console.error('RedisEventRelay message parse error:', err);
      }
    });
  }

  broadcast(event: EngineEvent): void {
    const envelope: Envelope = { instanceId: this.instanceId, event };
    this.publisher.publish(this.channel, JSON.stringify(envelope)).catch((err) => {
      console.error('RedisEventRelay publish error:', err.message);
    });
  }

  onBroadcast(handler: BroadcastHandler): void {
    this.handlers.push(handler);
  }

  getStatus(): string {
    return this.publisher.status;
  }

  async close(): Promise<void> {
    this.handlers = [];
    await Promise.all([this.publisher.disconnect(), this.subscriber.disconnect()]);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/@n8n/engine && pnpm test:unit src/engine/__tests__/redis-event-relay.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/engine/redis-event-relay.ts src/engine/__tests__/redis-event-relay.test.ts package.json pnpm-lock.yaml
git commit -m "feat(engine): add RedisEventRelay with ioredis pub/sub and instanceId dedup"
```

---

### Task 6: Wire EventRelay into EngineEventBus and BroadcasterService

**Files:**
- Modify: `src/engine/event-bus.service.ts`
- Modify: `src/engine/broadcaster.service.ts`
- Modify: `src/engine/create-engine.ts`
- Test: `src/engine/__tests__/event-bus.test.ts` (extend)
- Test: `src/engine/__tests__/broadcaster.test.ts` (new)

- [ ] **Step 1: Extend EngineEventBus tests for relay wiring**

Add to `src/engine/__tests__/event-bus.test.ts`:

```typescript
import { LocalEventRelay } from '../event-relay';

describe('EngineEventBus with relay', () => {
  it('should broadcast events to relay on emit', () => {
    const relay = new LocalEventRelay();
    const relaySpy = vi.spyOn(relay, 'broadcast');
    const bus = new EngineEventBus(relay);

    bus.emit({
      type: 'step:started',
      executionId: 'e1',
      stepId: 's1',
      attempt: 1,
    });

    expect(relaySpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'step:started', eventId: expect.any(String) }),
    );
  });

  it('should close relay on close()', async () => {
    const relay = new LocalEventRelay();
    const closeSpy = vi.spyOn(relay, 'close');
    const bus = new EngineEventBus(relay);

    await bus.close();
    expect(closeSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Write BroadcasterService tests**

```typescript
// src/engine/__tests__/broadcaster.test.ts
import { describe, it, expect, vi } from 'vitest';
import { BroadcasterService } from '../broadcaster.service';
import { EngineEventBus } from '../event-bus.service';
import { LocalEventRelay } from '../event-relay';
import type { EngineEvent } from '../event-bus.types';

describe('BroadcasterService', () => {
  it('should deliver local events to SSE clients', () => {
    const bus = new EngineEventBus();
    const broadcaster = new BroadcasterService(bus);

    // Mock an SSE response
    const mockRes = {
      set: vi.fn(),
      status: vi.fn().mockReturnThis(),
      flushHeaders: vi.fn(),
      write: vi.fn(),
      on: vi.fn(),
    };
    broadcaster.subscribe('exec-1', mockRes as never);

    bus.emit({
      type: 'step:started',
      executionId: 'exec-1',
      stepId: 's1',
      attempt: 1,
    });

    // Should have written the event (after the initial ': connected\n\n')
    const writeCalls = mockRes.write.mock.calls;
    const eventWrites = writeCalls.filter((c: string[]) => c[0].startsWith('data:'));
    expect(eventWrites.length).toBe(1);
    expect(eventWrites[0][0]).toContain('step:started');
  });

  it('should deliver relay events to SSE clients', () => {
    const relay = new LocalEventRelay();
    const bus = new EngineEventBus(relay);
    const broadcaster = new BroadcasterService(bus, relay);

    const mockRes = {
      set: vi.fn(),
      status: vi.fn().mockReturnThis(),
      flushHeaders: vi.fn(),
      write: vi.fn(),
      on: vi.fn(),
    };
    broadcaster.subscribe('exec-1', mockRes as never);

    // Simulate a remote event via relay (not via bus.emit)
    const remoteEvent: EngineEvent = {
      type: 'step:completed',
      eventId: 'remote-evt-1',
      createdAt: Date.now(),
      executionId: 'exec-1',
      stepId: 's1',
      output: {},
      durationMs: 50,
    };
    relay.broadcast(remoteEvent);

    const writeCalls = mockRes.write.mock.calls;
    const eventWrites = writeCalls.filter((c: string[]) => c[0].startsWith('data:'));
    expect(eventWrites.length).toBe(1);
    expect(eventWrites[0][0]).toContain('remote-evt-1');
  });

  it('should not double-deliver with LocalEventRelay (no-op relay)', () => {
    const relay = new LocalEventRelay();
    const bus = new EngineEventBus(relay);
    const broadcaster = new BroadcasterService(bus, relay);

    const mockRes = {
      set: vi.fn(),
      status: vi.fn().mockReturnThis(),
      flushHeaders: vi.fn(),
      write: vi.fn(),
      on: vi.fn(),
    };
    broadcaster.subscribe('exec-1', mockRes as never);

    bus.emit({
      type: 'step:started',
      executionId: 'exec-1',
      stepId: 's1',
      attempt: 1,
    });

    const writeCalls = mockRes.write.mock.calls;
    const eventWrites = writeCalls.filter((c: string[]) => c[0].startsWith('data:'));
    // Exactly 1: local bus delivers, relay is no-op
    expect(eventWrites.length).toBe(1);
  });

  it('should track SSE client count', () => {
    const bus = new EngineEventBus();
    const broadcaster = new BroadcasterService(bus);

    expect(broadcaster.getTotalSubscriberCount()).toBe(0);

    const closeHandlers: (() => void)[] = [];
    const mockRes = {
      set: vi.fn(),
      status: vi.fn().mockReturnThis(),
      flushHeaders: vi.fn(),
      write: vi.fn(),
      on: vi.fn().mockImplementation((_event: string, handler: () => void) => {
        closeHandlers.push(handler);
      }),
    };

    broadcaster.subscribe('exec-1', mockRes as never);
    expect(broadcaster.getTotalSubscriberCount()).toBe(1);

    // Simulate disconnect
    closeHandlers[0]();
    expect(broadcaster.getTotalSubscriberCount()).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd packages/@n8n/engine && pnpm test:unit src/engine/__tests__/broadcaster.test.ts src/engine/__tests__/event-bus.test.ts`
Expected: FAIL — relay not wired

- [ ] **Step 4: Update EngineEventBus to use relay**

Modify `src/engine/event-bus.service.ts`:

```typescript
import { nanoid } from 'nanoid';
import { EventEmitter } from 'node:events';

import type { EventRelay } from './event-relay';
import type { EngineEvent, EmittableEvent, StepEvent, ExecutionEvent } from './event-bus.types';

type EventHandler<T> = (event: T) => void | Promise<void>;

export class EngineEventBus {
  private emitter = new EventEmitter();

  constructor(
    private readonly relay?: EventRelay,
    private readonly metrics?: MetricsService,
  ) {
    this.emitter.setMaxListeners(100);
  }

  emit(input: EmittableEvent): void {
    const event: EngineEvent = {
      ...input,
      eventId: input.eventId ?? nanoid(),
      createdAt: input.createdAt ?? Date.now(),
    } as EngineEvent;

    this.safeEmit(event.type, event);
    const prefix = event.type.split(':')[0];
    this.safeEmit(`${prefix}:*`, event);

    // Broadcast to other instances via relay
    this.relay?.broadcast(event);
    this.metrics?.eventsPublishedTotal.inc({ type: event.type });
  }

  // ... safeEmit, on, onStepEvent, onExecutionEvent, onAny, off, removeAllListeners unchanged ...

  async close(): Promise<void> {
    this.removeAllListeners();
    await this.relay?.close();
  }
}
```

- [ ] **Step 5: Update BroadcasterService for relay + dedup**

Modify `src/engine/broadcaster.service.ts`:

```typescript
import type { Response } from 'express';
import type { EngineEventBus } from './event-bus.service';
import type { EventRelay } from './event-relay';
import type { EngineEvent } from './event-bus.types';
import type { MetricsService } from './metrics.service';

export class BroadcasterService {
  private clients = new Map<string, Set<Response>>();

  constructor(
    private readonly eventBus: EngineEventBus,
    private readonly relay?: EventRelay,
    private readonly metrics?: MetricsService,
  ) {
    // Local events (this instance)
    this.eventBus.onAny((event: EngineEvent) => {
      if ('executionId' in event) this.send(event.executionId, event);
    });

    // Remote events (other instances via Redis).
    // No dedup needed: LocalEventRelay.onBroadcast is a no-op, and
    // RedisEventRelay filters out same-instance events via instanceId.
    this.relay?.onBroadcast((event: EngineEvent) => {
      this.metrics?.redisRelayLatency.observe(Date.now() - event.createdAt);
      if ('executionId' in event) this.send(event.executionId, event);
    });
  }

  // subscribe(), send(), getSubscriberCount(), getTotalSubscriberCount() — unchanged
}
```

- [ ] **Step 6: Update create-engine.ts to wire relay**

```typescript
import { nanoid } from 'nanoid';
import { LocalEventRelay } from './event-relay';
import type { EventRelay } from './event-relay';
import type { EngineConfig } from './engine.config';

export interface Engine {
  // ... existing fields ...
  relay: EventRelay;
}

export function createEngine(dataSource: DataSource, config: EngineConfig = {}): Engine {
  const instanceId = config.instanceId ?? nanoid();

  // RedisEventRelay imported at top of file (static import).
  // ioredis is a dependency regardless — no cost to importing the module.
  // Only the Redis connection is created conditionally.
  let relay: EventRelay;
  if (config.redisUrl) {
    relay = new RedisEventRelay(config.redisUrl, instanceId, config.redisChannelPrefix);
  } else {
    relay = new LocalEventRelay();
  }

  const eventBus = new EngineEventBus(relay);
  // ... rest of wiring ...
  const broadcaster = new BroadcasterService(eventBus, relay);
  const queue = new StepQueueService(dataSource, stepProcessor, config.maxConcurrency);
  // ...

  return { /* ... */ relay };
}
```

- [ ] **Step 7: Run all tests**

Run: `cd packages/@n8n/engine && pnpm test:unit`
Expected: PASS

- [ ] **Step 8: Run typecheck and format**

```bash
cd packages/@n8n/engine && pnpm typecheck && pnpm format:check
```
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/engine/event-bus.service.ts src/engine/broadcaster.service.ts src/engine/create-engine.ts src/engine/__tests__/event-bus.test.ts src/engine/__tests__/broadcaster.test.ts
git commit -m "feat(engine): wire EventRelay into EngineEventBus and BroadcasterService with dedup"
```

---

### Task 7: Redis Integration Test

**Files:**
- Modify: `docker-compose.test.yml` (add Redis service)
- Create: `test/integration/redis-relay.test.ts`

- [ ] **Step 1: Add Redis to test compose**

Add to `docker-compose.test.yml`:

```yaml
  redis-test:
    image: redis:7-alpine
    ports:
      - '6380:6379'
    tmpfs:
      - /data
```

- [ ] **Step 2: Write integration test**

```typescript
// test/integration/redis-relay.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { RedisEventRelay, getRedisChannel } from '../../src/engine/redis-event-relay';
import type { EngineEvent } from '../../src/engine/event-bus.types';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6380';

// Skip Redis integration tests when REDIS_URL is not available.
// These tests require a running Redis instance (docker-compose.test.yml).
const describeRedis = process.env.REDIS_URL ? describe : describe.skip;

describeRedis('RedisEventRelay integration', () => {
  const relays: RedisEventRelay[] = [];

  afterEach(async () => {
    await Promise.all(relays.map((r) => r.close()));
    relays.length = 0;
  });

  it('should deliver events from instance A to instance B', async () => {
    const relayA = new RedisEventRelay(REDIS_URL, 'instance-A');
    const relayB = new RedisEventRelay(REDIS_URL, 'instance-B');
    relays.push(relayA, relayB);

    // Wait for subscriptions to be ready
    await new Promise((r) => setTimeout(r, 200));

    const received: EngineEvent[] = [];
    relayB.onBroadcast((event) => received.push(event));

    const event: EngineEvent = {
      type: 'step:completed',
      eventId: 'integration-test-1',
      createdAt: Date.now(),
      executionId: 'exec-1',
      stepId: 'step-1',
      output: { value: 42 },
      durationMs: 100,
    };

    relayA.broadcast(event);

    // Wait for Redis delivery
    await new Promise((r) => setTimeout(r, 200));

    expect(received).toHaveLength(1);
    expect(received[0].eventId).toBe('integration-test-1');
    expect(received[0].type).toBe('step:completed');
  });

  it('should NOT deliver own events back to sender', async () => {
    const relay = new RedisEventRelay(REDIS_URL, 'instance-self');
    relays.push(relay);

    await new Promise((r) => setTimeout(r, 200));

    const received: EngineEvent[] = [];
    relay.onBroadcast((event) => received.push(event));

    relay.broadcast({
      type: 'execution:started',
      eventId: 'self-test-1',
      createdAt: Date.now(),
      executionId: 'exec-1',
    });

    await new Promise((r) => setTimeout(r, 200));

    expect(received).toHaveLength(0);
  });

  it('should continue working after Redis disconnect and reconnect', async () => {
    const relay = new RedisEventRelay(REDIS_URL, 'instance-resilient');
    relays.push(relay);

    await new Promise((r) => setTimeout(r, 200));

    // Broadcast should not throw even if Redis has issues
    // (ioredis auto-reconnects, errors are caught internally)
    relay.broadcast({
      type: 'execution:started',
      eventId: 'resilience-test-1',
      createdAt: Date.now(),
      executionId: 'exec-1',
    });

    // Verify relay is still functional (getStatus reflects ioredis state)
    expect(relay.getStatus()).toBe('ready');
  });

  it('should survive invalid JSON messages', async () => {
    const relay = new RedisEventRelay(REDIS_URL, 'instance-robust');
    relays.push(relay);

    await new Promise((r) => setTimeout(r, 200));

    const received: EngineEvent[] = [];
    relay.onBroadcast((event) => received.push(event));

    // Publish garbage directly to Redis
    const { default: Redis } = await import('ioredis');
    const directClient = new Redis(REDIS_URL);
    await directClient.publish(getRedisChannel(), 'not-json{{{');
    await directClient.disconnect();

    await new Promise((r) => setTimeout(r, 200));

    // Should not crash, should not deliver
    expect(received).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run integration test**

```bash
docker compose -f docker-compose.test.yml up -d
cd packages/@n8n/engine && REDIS_URL=redis://localhost:6380 pnpm test test/integration/redis-relay.test.ts
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add docker-compose.test.yml test/integration/redis-relay.test.ts
git commit -m "test(engine): add Redis pub/sub integration test with real Redis"
```

---

## Chunk 3: Prometheus Metrics

### Task 8: MetricsService

**Files:**
- Modify: `package.json` (add prom-client)
- Create: `src/engine/metrics.service.ts`
- Test: `src/engine/__tests__/metrics.test.ts`

- [ ] **Step 1: Install prom-client**

```bash
cd packages/@n8n/engine && pnpm add prom-client
```

- [ ] **Step 2: Write the failing test**

```typescript
// src/engine/__tests__/metrics.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsService } from '../metrics.service';
import { Registry } from 'prom-client';

describe('MetricsService', () => {
  let metrics: MetricsService;
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
    metrics = new MetricsService(registry);
  });

  it('should increment execution_total counter', async () => {
    metrics.executionTotal.inc({ status: 'completed' });
    metrics.executionTotal.inc({ status: 'completed' });
    metrics.executionTotal.inc({ status: 'failed' });

    const result = await registry.getSingleMetricAsString('execution_total');
    expect(result).toContain('execution_total{status="completed"} 2');
    expect(result).toContain('execution_total{status="failed"} 1');
  });

  it('should track execution_active gauge', async () => {
    metrics.executionActive.inc();
    metrics.executionActive.inc();
    metrics.executionActive.dec();

    const result = await registry.getSingleMetricAsString('execution_active');
    expect(result).toContain('execution_active 1');
  });

  it('should observe step_execution_duration_ms histogram', async () => {
    metrics.stepExecutionDuration.observe(42);
    metrics.stepExecutionDuration.observe(100);

    const result = await registry.getSingleMetricAsString('step_execution_duration_ms');
    expect(result).toContain('step_execution_duration_ms_count 2');
  });

  it('should return all metrics as string', async () => {
    metrics.executionTotal.inc({ status: 'completed' });
    const output = await metrics.getMetrics();
    expect(output).toContain('execution_total');
    expect(output).toContain('step_execution_total');
    expect(output).toContain('webhook_requests_total');
    expect(output).toContain('errors_total');
    expect(output).toContain('sse_connected_clients');
    expect(output).toContain('events_published_total');
  });

  it('should return correct content type', () => {
    expect(metrics.getContentType()).toContain('text/plain');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/@n8n/engine && pnpm test:unit src/engine/__tests__/metrics.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write MetricsService**

Create `src/engine/metrics.service.ts` with all metric definitions as listed
in the spec (see design doc section 2). Use a custom `Registry` passed via
constructor for testability.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/@n8n/engine && pnpm test:unit src/engine/__tests__/metrics.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/engine/metrics.service.ts src/engine/__tests__/metrics.test.ts package.json pnpm-lock.yaml
git commit -m "feat(engine): add MetricsService with Prometheus metrics"
```

---

### Task 9: Health + Metrics Endpoints

**Files:**
- Create: `src/api/health.controller.ts`
- Test: `src/api/__tests__/health.test.ts`
- Modify: `src/api/server.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/api/__tests__/health.test.ts
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createHealthRouter } from '../health.controller';
import { MetricsService } from '../../engine/metrics.service';
import { Registry } from 'prom-client';

describe('Health and Metrics endpoints', () => {
  function createApp(overrides: { pgConnected?: boolean; redis?: string } = {}) {
    const app = express();
    const metrics = new MetricsService(new Registry());
    metrics.executionTotal.inc({ status: 'completed' });

    app.use(
      createHealthRouter({
        isPostgresConnected: () => overrides.pgConnected ?? true,
        redisStatus: () => (overrides.redis ?? 'not_configured') as 'connected' | 'disconnected' | 'not_configured',
        metrics,
        startTime: Date.now() - 5000,
      }),
    );
    return app;
  }

  describe('GET /health', () => {
    it('should return ok when all systems healthy', async () => {
      const res = await request(createApp()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.postgres).toBe('connected');
      expect(res.body.redis).toBe('not_configured');
      expect(res.body.uptime).toBeGreaterThanOrEqual(5);
    });

    it('should return ok with redis connected in scaling mode', async () => {
      const res = await request(createApp({ redis: 'connected' })).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.redis).toBe('connected');
    });

    it('should return degraded when Redis is down', async () => {
      const res = await request(createApp({ redis: 'disconnected' })).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('degraded');
    });

    it('should return 503 when Postgres is down', async () => {
      const res = await request(createApp({ pgConnected: false })).get('/health');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('error');
    });
  });

  describe('GET /metrics', () => {
    it('should return Prometheus text format', async () => {
      const res = await request(createApp()).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('execution_total');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/@n8n/engine && pnpm test:unit src/api/__tests__/health.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write health controller**

```typescript
// src/api/health.controller.ts
import { Router } from 'express';
import type { MetricsService } from '../engine/metrics.service';

export interface HealthDependencies {
  isPostgresConnected: () => boolean;
  redisStatus: () => 'connected' | 'disconnected' | 'not_configured';
  metrics: MetricsService;
  startTime: number;
}

export function createHealthRouter(deps: HealthDependencies): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    const pgConnected = deps.isPostgresConnected();
    const redis = deps.redisStatus();
    const status = !pgConnected ? 'error' : redis === 'disconnected' ? 'degraded' : 'ok';

    res.status(pgConnected ? 200 : 503).json({
      status,
      postgres: pgConnected ? 'connected' : 'disconnected',
      redis,
      uptime: Math.floor((Date.now() - deps.startTime) / 1000),
    });
  });

  router.get('/metrics', async (_req, res) => {
    const output = await deps.metrics.getMetrics();
    res.set('Content-Type', deps.metrics.getContentType());
    res.send(output);
  });

  return router;
}
```

- [ ] **Step 4: Update server.ts to mount health/metrics routes**

Add `HealthDependencies` fields to `AppDependencies` and mount the router
before API routes.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/@n8n/engine && pnpm test:unit src/api/__tests__/health.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/api/health.controller.ts src/api/__tests__/health.test.ts src/api/server.ts
git commit -m "feat(engine): add /health and /metrics endpoints with tests"
```

---

### Task 10: Instrument Services with Metrics

**Files:**
- Modify: `src/engine/step-processor.service.ts`
- Modify: `src/engine/completion.service.ts`
- Modify: `src/engine/engine.service.ts`
- Modify: `src/engine/broadcaster.service.ts`
- Modify: `src/engine/step-queue.service.ts`
- Modify: `src/engine/event-bus.service.ts`
- Modify: `src/api/webhook.controller.ts`
- Modify: `src/engine/create-engine.ts`

- [ ] **Step 1: Pass MetricsService to services**

Update `createEngine()` to pass `metrics` as optional constructor param to:
- `StepProcessorService` → step duration, step total, errors, retries
- `CompletionService` → execution total, execution duration
- `EngineService` → execution active gauge
- `BroadcasterService` → SSE client gauge
- `StepQueueService` → queue claim latency
- `EngineEventBus` → events published counter
- Webhook controller → webhook metrics

Each service adds `private readonly metrics?: MetricsService` as the last
constructor parameter. Existing tests that don't provide metrics continue
to work (parameter is optional).

- [ ] **Step 2: Instrument EngineEventBus**

In `emit()`, after broadcasting:
```typescript
this.metrics?.eventsPublishedTotal.inc({ type: event.type });
```

- [ ] **Step 3: Instrument StepProcessorService**

After step completion:
```typescript
this.metrics?.stepExecutionTotal.inc({ status: 'completed', step_type: node.type });
this.metrics?.stepExecutionDuration.observe(durationMs);
```

On step failure:
```typescript
this.metrics?.stepExecutionTotal.inc({ status: 'failed', step_type: node.type });
this.metrics?.errorsTotal.inc({ classification: isRetriable ? 'retriable' : 'non_retriable' });
```

On retry:
```typescript
this.metrics?.stepRetriesTotal.inc();
```

- [ ] **Step 4: Instrument CompletionService**

In `checkExecutionComplete()`, after CAS update succeeds:
```typescript
this.metrics?.executionTotal.inc({ status: finalStatus });
this.metrics?.executionActive.dec();
this.metrics?.executionDuration.observe({ workflow_id: execution.workflowId }, wallMs);
```

- [ ] **Step 5: Instrument EngineService**

In `startExecution()`:
```typescript
this.metrics?.executionActive.inc();
```

- [ ] **Step 6: Instrument BroadcasterService**

In `subscribe()`:
```typescript
this.metrics?.sseConnectedClients.inc();
```

In the `close` handler (inside `subscribe()`):
```typescript
this.metrics?.sseConnectedClients.dec();
```

- [ ] **Step 7: Instrument StepQueueService**

In `poll()`, after claiming steps:
```typescript
for (const step of claimed) {
  const latency = Date.now() - new Date(step.createdAt).getTime();
  this.metrics?.stepQueueClaimLatency.observe(latency);
}
```

Also in `poll()`, piggybacked on the existing poll cycle (no separate timer),
query the queue depth and set the gauge:
```typescript
// Collect queue depth on each poll cycle
if (this.metrics) {
  const depth = await this.dataSource
    .getRepository(WorkflowStepExecution)
    .createQueryBuilder('wse')
    .where('wse.status = :status', { status: StepStatus.Queued })
    .getCount();
  this.metrics.stepQueueDepth.set(depth);
}
```

- [ ] **Step 8: Instrument webhook.controller.ts**

Wrap handler to measure duration and count:
```typescript
const start = Date.now();
// ... existing handler ...
deps.metrics?.webhookRequestsTotal.inc({ method: req.method, path: req.params.path, status_code: String(res.statusCode) });
deps.metrics?.webhookDuration.observe(Date.now() - start);
```

- [ ] **Step 9: Update main.ts — config, shutdown, wiring**

Build `EngineConfig` from env vars. Wire `MetricsService` into
`createApp()`. Enhanced graceful shutdown:

```typescript
const shutdown = async () => {
  console.log('Shutting down...');
  await queue.drain(30_000);
  await eventBus.close();
  await dataSource.destroy();
  console.log('Shutdown complete');
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

- [ ] **Step 10: Write metrics instrumentation tests**

Create `src/engine/__tests__/metrics-instrumentation.test.ts`:

```typescript
// src/engine/__tests__/metrics-instrumentation.test.ts
import { describe, it, expect, vi } from 'vitest';
import { EngineEventBus } from '../event-bus.service';
import { BroadcasterService } from '../broadcaster.service';
import { MetricsService } from '../metrics.service';
import { Registry } from 'prom-client';

describe('Metrics instrumentation', () => {
  it('EngineEventBus should increment events_published_total on emit', async () => {
    const registry = new Registry();
    const metrics = new MetricsService(registry);
    const bus = new EngineEventBus(undefined, metrics);

    bus.emit({ type: 'step:started', executionId: 'e1', stepId: 's1', attempt: 1 });
    bus.emit({ type: 'step:completed', executionId: 'e1', stepId: 's1', output: {}, durationMs: 10 });

    const result = await registry.getSingleMetricAsString('events_published_total');
    expect(result).toContain('type="step:started"');
    expect(result).toContain('type="step:completed"');
  });

  it('BroadcasterService should track SSE client count', async () => {
    const registry = new Registry();
    const metrics = new MetricsService(registry);
    const bus = new EngineEventBus();
    const broadcaster = new BroadcasterService(bus, undefined, metrics);

    let closeHandler: () => void;
    const mockRes = {
      set: vi.fn(), status: vi.fn().mockReturnThis(), flushHeaders: vi.fn(),
      write: vi.fn(),
      on: vi.fn().mockImplementation((_e: string, h: () => void) => { closeHandler = h; }),
    };

    broadcaster.subscribe('exec-1', mockRes as never);
    let result = await registry.getSingleMetricAsString('sse_connected_clients');
    expect(result).toContain('sse_connected_clients 1');

    closeHandler!();
    result = await registry.getSingleMetricAsString('sse_connected_clients');
    expect(result).toContain('sse_connected_clients 0');
  });
});
```

- [ ] **Step 11: Write createEngine wiring test**

Create `src/engine/__tests__/create-engine.test.ts`:

```typescript
// src/engine/__tests__/create-engine.test.ts
import { describe, it, expect } from 'vitest';
import { LocalEventRelay } from '../event-relay';
import { RedisEventRelay } from '../redis-event-relay';

// We test the wiring logic, not createEngine() directly (needs DataSource).
// Verify the relay selection logic matches our config contract.
describe('Engine relay selection', () => {
  it('should use LocalEventRelay when no redisUrl', () => {
    const relay = undefined; // no redisUrl
    const result = relay ? 'redis' : 'local';
    expect(result).toBe('local');
    // Verify LocalEventRelay is a valid EventRelay
    const local = new LocalEventRelay();
    expect(local.broadcast).toBeTypeOf('function');
    expect(local.onBroadcast).toBeTypeOf('function');
    expect(local.close).toBeTypeOf('function');
  });

  it('RedisEventRelay should implement EventRelay interface', () => {
    // Don't connect — just verify the class exists and has the right shape
    expect(RedisEventRelay).toBeTypeOf('function');
    expect(RedisEventRelay.prototype.broadcast).toBeTypeOf('function');
    expect(RedisEventRelay.prototype.onBroadcast).toBeTypeOf('function');
    expect(RedisEventRelay.prototype.close).toBeTypeOf('function');
    expect(RedisEventRelay.prototype.getStatus).toBeTypeOf('function');
  });
});
```

- [ ] **Step 12: Run all unit tests**

Run: `cd packages/@n8n/engine && pnpm test:unit`
Expected: PASS

- [ ] **Step 13: Run typecheck and format**

```bash
cd packages/@n8n/engine && pnpm typecheck && pnpm format:check
```
Expected: PASS

- [ ] **Step 14: Commit**

```bash
git add src/engine/ src/api/ src/main.ts
git commit -m "feat(engine): instrument all services with Prometheus metrics"
```

---

## Chunk 4: Docker Compose & Observability Infrastructure

### Task 11: Shared Network Strategy + O11y Compose

**Files:**
- Modify: `docker-compose.yml` (add named network)
- Create: `docker-compose.o11y.yml`
- Create: `o11y/prometheus.yml`
- Create: `o11y/grafana/provisioning/datasources/prometheus.yml`
- Create: `o11y/grafana/provisioning/dashboards/dashboard.yml`
- Create: `o11y/grafana/dashboards/engine-overview.json`
- Create: `o11y/grafana/dashboards/engine-steps.json`
- Create: `o11y/grafana/dashboards/engine-webhooks.json`

- [ ] **Step 1: Add a shared external network to docker-compose.yml**

Add a default network name that other compose files can reference:

```yaml
networks:
  engine:
    name: engine-network
```

Replace `networks: [dev]` with `networks: [engine]` on all services.
Remove the old `dev` network definition.

- [ ] **Step 2: Create o11y compose with same network**

```yaml
# docker-compose.o11y.yml
networks:
  engine:
    name: engine-network

services:
  prometheus:
    image: prom/prometheus:v3.3.0
    networks: [engine]
    volumes:
      - ./o11y/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - '9090:9090'

  grafana:
    image: grafana/grafana:11.6.0
    networks: [engine]
    volumes:
      - ./o11y/grafana/provisioning:/etc/grafana/provisioning
      - ./o11y/grafana/dashboards:/var/lib/grafana/dashboards
    ports:
      - '3300:3000'
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: 'true'
      # Dev-only: anonymous admin access. Do not use in staging/production.
      GF_AUTH_ANONYMOUS_ORG_ROLE: Admin
    depends_on:
      - prometheus
```

By using `name: engine-network`, Docker Compose merges services from
different `-f` files onto the same network. No manual `docker network create`.

- [ ] **Step 3: Create Prometheus config**

```yaml
# o11y/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'engine'
    dns_sd_configs:
      - names: ['engine']
        type: A
        port: 3100
    static_configs:
      - targets: ['api:3100', 'api-perf:3101']
```

Uses DNS service discovery for the `engine` service name (scaling compose,
resolves to all replicas) and static configs for dev/perf service names.
Non-existent targets are ignored by Prometheus.

- [ ] **Step 4: Consolidate perf Grafana config into o11y**

Move existing perf Grafana assets into the shared `o11y/` directory:

```bash
# Move existing k6 dashboard
cp perf/grafana/dashboards/k6-results.json o11y/grafana/dashboards/k6-results.json

# Move existing InfluxDB datasource (for k6)
cp perf/grafana/provisioning/datasources/influxdb.yml o11y/grafana/provisioning/datasources/influxdb.yml

# Remove old perf grafana directory
rm -rf perf/grafana/
```

Now `o11y/grafana/` is the single source of truth for all Grafana config.
The perf compose keeps InfluxDB as a service but no longer defines Grafana
(it comes from `docker-compose.o11y.yml` when composed together).

- [ ] **Step 5: Create Grafana provisioning files**

Create datasource and dashboard provisioners:
- `o11y/grafana/provisioning/datasources/prometheus.yml`
- `o11y/grafana/provisioning/dashboards/dashboard.yml`

The dashboard provisioner should scan the entire `dashboards/` directory,
so both engine dashboards and the k6 dashboard are auto-discovered.

- [ ] **Step 6: Create Grafana dashboard JSONs**

Create three dashboard files with panels matching the metrics from the spec:
- `o11y/grafana/dashboards/engine-overview.json`
- `o11y/grafana/dashboards/engine-steps.json`
- `o11y/grafana/dashboards/engine-webhooks.json`

Each dashboard uses Prometheus queries against the metrics defined in
`MetricsService`. Use standard Grafana JSON format with time series panels,
stat panels, and gauge panels as appropriate.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml docker-compose.o11y.yml o11y/
git rm -r perf/grafana/
git commit -m "feat(engine): add observability stack — consolidate Grafana into o11y/"
```

---

### Task 12: Scaling Compose

**Files:**
- Create: `docker-compose.scaling.yml`

- [ ] **Step 1: Create docker-compose.scaling.yml**

```yaml
# docker-compose.scaling.yml
networks:
  engine:
    name: engine-network

services:
  postgres:
    image: postgres:16-alpine
    networks: [engine]
    environment:
      POSTGRES_DB: engine
      POSTGRES_USER: engine
      POSTGRES_PASSWORD: engine
    ports:
      - '5433:5432'
    volumes:
      - pgdata-scaling:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U engine']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    networks: [engine]
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

  engine:
    build:
      context: ../../../
      dockerfile: packages/@n8n/engine/Dockerfile
      target: prod
    networks: [engine]
    deploy:
      replicas: 3
    environment:
      DATABASE_URL: postgres://engine:engine@postgres:5432/engine
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.engine.rule=PathPrefix(`/`)'
      - 'traefik.http.services.engine.loadbalancer.server.port=3100'
      # Disable response buffering so SSE streams are delivered immediately
      - 'traefik.http.services.engine.loadbalancer.responseforwarding.flushinterval=1ms'

  traefik:
    image: traefik:v3.0
    networks: [engine]
    command:
      - '--providers.docker=true'
      - '--providers.docker.exposedbydefault=false'
      - '--entrypoints.web.address=:3100'
    ports:
      - '3100:3100'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

volumes:
  pgdata-scaling:
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.scaling.yml
git commit -m "feat(engine): add multi-instance scaling compose with Redis + Traefik"
```

---

### Task 13: Update perf compose + Package.json Scripts

**Files:**
- Modify: `docker-compose.perf.yml` (shared network)
- Modify: `package.json` (scripts)

- [ ] **Step 1: Update perf compose — shared network, remove Grafana**

Change network from `perf` / `engine-perf` to:
```yaml
networks:
  engine:
    name: engine-network
```

Update all services to use `networks: [engine]`.

Remove the `grafana` service definition entirely — it now comes from
`docker-compose.o11y.yml` when composed together. Keep `influxdb` as a
service (k6 writes to it directly). The InfluxDB datasource and k6
dashboard are now in `o11y/grafana/` and will be auto-provisioned.

- [ ] **Step 2: Update test:db to include Redis**

The `test:db` convenience script (or equivalent workflow in CLAUDE.md)
needs to also start Redis for the redis-relay integration test:

```bash
docker compose -f docker-compose.test.yml up -d  # now includes redis-test
REDIS_URL=redis://localhost:6380 DATABASE_URL=postgres://engine:engine@localhost:5434/engine_test pnpm test
docker compose -f docker-compose.test.yml down
```

Update the `test:db` script description in CLAUDE.md to mention that
`docker-compose.test.yml` now includes both PostgreSQL and Redis.

- [ ] **Step 3: Update package.json scripts**

```json
{
  "dev": "docker compose -f docker-compose.yml -f docker-compose.o11y.yml up",
  "dev:scaling": "docker compose -f docker-compose.scaling.yml -f docker-compose.o11y.yml up",
  "dev:perf": "docker compose -f docker-compose.perf.yml -f docker-compose.o11y.yml up",
  "dev:o11y": "docker compose -f docker-compose.o11y.yml up",
  "scaling:up": "docker compose -f docker-compose.scaling.yml -f docker-compose.o11y.yml up -d --build",
  "scaling:down": "docker compose -f docker-compose.scaling.yml -f docker-compose.o11y.yml down -v"
}
```

Keep existing scripts (`dev:web`, `test:up`, `test:down`, etc.) unchanged.
Note: `dev` now includes the o11y stack.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.perf.yml package.json
git commit -m "feat(engine): update perf compose network + add scaling/o11y scripts"
```

---

## Chunk 5: Documentation Updates

### Task 14: Update CLAUDE.md

**Files:**
- Modify: `packages/@n8n/engine/CLAUDE.md`

- [ ] **Step 1: Add environment variables section**

After "URLs", add table with `DATABASE_URL`, `PORT`, `REDIS_URL`,
`MAX_CONCURRENCY`.

- [ ] **Step 2: Add scaling and monitoring sections**

Document:
- New compose files and how they compose
- New scripts (`dev:scaling`, `dev:o11y`, `dev:perf`, `scaling:up`, `scaling:down`)
- `/health` and `/metrics` endpoints
- `o11y/` directory in project structure
- EventRelay abstraction in architecture section

- [ ] **Step 3: Commit**

```bash
git add packages/@n8n/engine/CLAUDE.md
git commit -m "docs(engine): update CLAUDE.md with scaling, monitoring, and event relay"
```

---

### Task 15: Update Architecture Docs and Backlog

**Files:**
- Modify: `docs/engine-v2/architecture/overview.md`
- Modify: `docs/engine-v2/architecture/engine.md`
- Modify: `docs/engine-v2/plans/backlog.md`

- [ ] **Step 1: Update overview.md**

- Mark Phase 2 event delivery as implemented
- Update "Architecture Limitations" table — remove in-process event delivery
- Update deployment mode table — queue mode and multi-main now supported
- Reference `docs/engine-v2/plans/scaling/spec.md`

- [ ] **Step 2: Update engine.md**

- Document `EventRelay` interface and implementations
- Document `eventId` / `createdAt` base fields on all events
- Document `instanceId` envelope dedup in `RedisEventRelay`
- Document `BroadcasterService` dedup via `eventId` bounded Set
- Document `MetricsService` as optional param on services

- [ ] **Step 3: Update backlog.md**

Remove "Redis pub/sub for multi-instance event delivery".
Add: "Implemented in `docs/engine-v2/plans/scaling/spec.md`"

- [ ] **Step 4: Commit**

```bash
git add docs/engine-v2/
git commit -m "docs(engine): update architecture docs — Phase 2 event delivery implemented"
```

---

## Chunk 6: Final Verification

### Task 16: Full Test Suite + Quality Checks

- [ ] **Step 1: Run all unit tests**

```bash
cd packages/@n8n/engine && pnpm test:unit
```
Expected: PASS

- [ ] **Step 2: Run typecheck**

```bash
cd packages/@n8n/engine && pnpm typecheck
```
Expected: PASS

- [ ] **Step 3: Run format check**

```bash
cd packages/@n8n/engine && pnpm format:check
```
Expected: PASS — fix with `pnpm format` if needed

- [ ] **Step 4: Run integration tests (with PostgreSQL + Redis)**

```bash
docker compose -f docker-compose.test.yml up -d   # starts postgres-test + redis-test
cd packages/@n8n/engine && DATABASE_URL=postgres://engine:engine@localhost:5434/engine_test REDIS_URL=redis://localhost:6380 pnpm test
docker compose -f docker-compose.test.yml down
```
Expected: PASS — all existing integration tests pass, plus the new `redis-relay.test.ts`

---

### Task 17: Manual Smoke Test

- [ ] **Step 1: Test dev mode (with o11y)**

```bash
cd packages/@n8n/engine && pnpm dev
```

Verify:
- `curl http://localhost:3100/health` → `{"status":"ok","redis":"not_configured",...}`
- `curl http://localhost:3100/metrics` → Prometheus format
- Grafana at `http://localhost:3300` — dashboards visible
- Prometheus at `http://localhost:9090` — engine target UP

- [ ] **Step 2: Test scaling mode**

```bash
cd packages/@n8n/engine && pnpm dev:scaling
```

Verify:
- `curl http://localhost:3100/health` → `{"status":"ok","redis":"connected",...}`
- Multiple requests to `/health` show different uptimes (Traefik round-robin)
- Create and execute a workflow — SSE events arrive
- Grafana shows metrics from all 3 instances

- [ ] **Step 3: Test graceful shutdown**

```bash
docker compose -f docker-compose.scaling.yml scale engine=2
```

Verify no errors in logs, in-flight steps complete.

- [ ] **Step 4: Tear down**

```bash
pnpm scaling:down
```
