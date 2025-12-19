# CRDT Abstraction Layer - Implementation Plan

## Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| **CRDTMap** | ✅ Complete | Full CRUD + nested maps + `onDeepChange` |
| **CRDTArray** | ✅ Complete | Full CRUD + nested arrays + `onDeepChange` with delta format |
| **CRDTText** | ❌ Not started | |
| **CRDTCounter** | ❌ Not started | |
| **encodeState / applyUpdate** | ✅ Complete | Full state encoding + incremental sync |
| **onUpdate** | ✅ Complete | Incremental updates (Automerge uses `saveSince`) |
| **SyncProvider** | ✅ Complete | Engine-agnostic `BaseSyncProvider` |
| **SyncTransport** | ✅ Complete | Interface + `MockTransport` for testing |
| **Error handling** | ✅ Complete | `SyncProvider.onError()` for malformed updates |
| **Reconnection handling** | 🔜 Phase 2 | To be implemented with real transports |
| **Awareness** | ❌ Not started | User presence, cursors |
| **UndoManager** | ❌ Not started | |
| **Persistence** | ❌ Not started | IndexedDB, filesystem adapters |
| **WebSocket Transport** | ❌ Not started | Includes reconnection + exponential backoff |
| **SharedWorker Transport** | ❌ Not started | Includes worker crash recovery |

**Summary:** Phase 0 and Phase 1 complete. Core data structures (Map, Array) and sync infrastructure are functional with 304 passing conformance tests. Ready for Phase 2 (real transports with reconnection, awareness) or additional data types (Text, Counter).

---

## Overview

Create a standalone `@n8n/crdt` package that provides a unified API for working with CRDT data structures, abstracting away the underlying library (Yjs or Automerge). The abstraction covers data structures, sync protocol, awareness, and persistence - all with pluggable transports.

## Design Decisions

| Aspect | Decision |
|--------|----------|
| Data structures | All (Map, Array, Text, Counter) |
| Awareness | Abstracted (user presence, cursors, activity) |
| Sync protocol | Abstracted with pluggable transports |
| Persistence | Abstracted |
| Package | New standalone `@n8n/crdt` |
| Abstraction level | Full isolation (provider name available for logging only) |
| Initial providers | Both Yjs and Automerge from day one |
| Testing | Conformance tests run against both providers |

---

## Architecture

```
+-------------------------------------------------------------+
|                    Consumer Code (FE/BE)                    |
+-----------------------------+-------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                      @n8n/crdt                              |
|  +-------------------------------------------------------+  |
|  |                   Public API                          |  |
|  |  - createDoc()                                        |  |
|  |  - CRDTMap, CRDTArray, CRDTText, CRDTCounter          |  |
|  |  - SyncManager, AwarenessManager                      |  |
|  |  - PersistenceManager                                 |  |
|  +---------------------------+---------------------------+  |
|                              |                              |
|                              v                              |
|  +-------------------------------------------------------+  |
|  |              Core Interfaces                          |  |
|  |  - CRDTProvider                                      |  |
|  |  - CRDTDoc, CRDTMap, CRDTArray, CRDTText          |  |
|  |  - SyncProvider, SyncTransport                      |  |
|  |  - Awareness                                         |  |
|  |  - PersistenceProvider                               |  |
|  +---------------------------+---------------------------+  |
|                              |                              |
|         +--------------------+--------------------+         |
|         v                    v                    v         |
|  +-------------+     +-------------+     +-------------+    |
|  | YjsProvider |     | Automerge   |     |  Future     |    |
|  |             |     | Provider    |     |  Provider   |    |
|  +-------------+     +-------------+     +-------------+    |
+-------------------------------------------------------------+
                              |
         +----------+---------+---------+----------+
         v          v         v         v          v
  +-----------+ +--------+ +-------+ +--------+ +--------+
  | WebSocket | | Shared | |WebRTC | | Custom | |  None  |
  | Transport | | Worker | |       | |        | |(local) |
  +-----------+ +--------+ +-------+ +--------+ +--------+
```

---

## Package Structure

```
packages/@n8n/crdt/
+-- package.json
+-- tsconfig.json
+-- src/
|   +-- index.ts                    # Public exports
|   |
|   +-- interfaces/                 # Core contracts
|   |   +-- provider.interface.ts   # CRDTProvider
|   |   +-- doc.interface.ts        # CRDTDoc
|   |   +-- types.interface.ts      # CRDTMap, CRDTArray, CRDTText, CRDTCounter
|   |   +-- sync.interface.ts       # SyncProvider, SyncTransport
|   |   +-- awareness.interface.ts  # Awareness
|   |   +-- persistence.interface.ts # PersistenceProvider
|   |   +-- events.interface.ts     # Change events, awareness events
|   |
|   +-- providers/
|   |   +-- yjs/
|   |   |   +-- yjs.provider.ts
|   |   |   +-- yjs.doc.ts
|   |   |   +-- yjs.map.ts
|   |   |   +-- yjs.array.ts
|   |   |   +-- yjs.text.ts
|   |   |   +-- yjs.counter.ts
|   |   |   +-- yjs.sync.ts
|   |   |   +-- yjs.awareness.ts
|   |   |   +-- yjs.persistence.ts
|   |   |
|   |   +-- automerge/
|   |       +-- automerge.provider.ts
|   |       +-- automerge.doc.ts
|   |       +-- automerge.map.ts
|   |       +-- automerge.array.ts
|   |       +-- automerge.text.ts
|   |       +-- automerge.counter.ts
|   |       +-- automerge.sync.ts
|   |       +-- automerge.awareness.ts  # Custom implementation (Automerge has no built-in)
|   |       +-- automerge.persistence.ts
|   |
|   +-- transports/
|   |   +-- transport.interface.ts
|   |   +-- websocket.transport.ts
|   |   +-- sharedworker.transport.ts  # FE <-> SharedWorker
|   |   +-- webrtc.transport.ts        # Future
|   |
|   +-- persistence/
|   |   +-- memory.persistence.ts   # For testing
|   |   +-- indexeddb.persistence.ts # Browser
|   |   +-- filesystem.persistence.ts # Node.js
|   |
|   +-- factory.ts                  # createCRDTProvider()
|   +-- config.ts                   # Configuration types
|
+-- test/
    +-- conformance/                # Tests that run against ALL providers
    |   +-- doc.conformance.test.ts
    |   +-- map.conformance.test.ts
    |   +-- array.conformance.test.ts
    |   +-- text.conformance.test.ts
    |   +-- counter.conformance.test.ts
    |   +-- deep-change.conformance.test.ts  # CRITICAL - ensures identical events
    |   +-- sync.conformance.test.ts
    |   +-- awareness.conformance.test.ts
    |   +-- persistence.conformance.test.ts
    |
    +-- unit/                       # Provider-specific tests
        +-- yjs/
        +-- automerge/
```

---

## Core Interfaces

### CRDTProvider

```typescript
interface CRDTProvider {
  readonly name: 'yjs' | 'automerge' | string; // For logging/debugging

  createDoc(id: string): CRDTDoc;

  // Sync
  createSyncProvider(doc: CRDTDoc, transport: SyncTransport): SyncProvider;

  // Awareness (user presence, cursors, activity state)
  createAwareness(doc: CRDTDoc, transport: SyncTransport): Awareness;

  // Persistence
  createPersistenceProvider(doc: CRDTDoc, storage: StorageAdapter): PersistenceProvider;
}
```

### CRDTDoc

```typescript
type Unsubscribe = () => void;

interface CRDTDoc {
  readonly id: string;

  // Type accessors
  getMap<T>(name: string): CRDTMap<T>;
  getArray<T>(name: string): CRDTArray<T>;
  getText(name: string): CRDTText;
  getCounter(name: string): CRDTCounter;

  // Transactions (batch changes, optional origin for undo tracking)
  transact(fn: () => void, origin?: string): void;

  // State
  encodeState(): Uint8Array;
  applyUpdate(update: Uint8Array): void;

  // Events
  onUpdate(handler: (update: Uint8Array, origin: unknown) => void): Unsubscribe;

  // Cleanup
  destroy(): void;
}
```

---

## Deep Change Events (Critical for UI)

This is the key abstraction that makes provider switching possible for UI use cases like VueFlow.

```typescript
// Unified deep change event - works identically for Yjs and Automerge
interface DeepChangeEvent {
  path: (string | number)[];  // Full path to changed value, e.g., ['node-1', 'position', 'x']
  action: 'add' | 'update' | 'delete';
  value?: unknown;            // New value (for add/update)
  oldValue?: unknown;         // Previous value (for update/delete)
}

// Example: User drags node-1 from (100,100) to (200,100)
// Events received:
// [
//   { path: ['node-1', 'position', 'x'], action: 'update', value: 200, oldValue: 100 }
// ]

// Example: User adds a new node
// [
//   { path: ['node-2'], action: 'add', value: { type: 'http', position: {x:300,y:200}, ... } }
// ]
```

**Implementation notes:**
- Yjs: Wraps `observeDeep` events, flattens nested YEvents into path-based changes
- Automerge: Converts patches from `Automerge.change()` to `DeepChangeEvent` format

---

## Data Types

### CRDTMap

```typescript
type Unsubscribe = () => void;

interface CRDTMap<T = unknown> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  delete(key: string): void;
  has(key: string): boolean;
  keys(): IterableIterator<string>;
  values(): IterableIterator<T>;
  entries(): IterableIterator<[string, T]>;
  toJSON(): Record<string, T>;

  // Shallow observation
  onChange(handler: (changes: MapChangeEvent<T>) => void): Unsubscribe;
  // Deep observation - CRITICAL for UI updates (e.g., VueFlow)
  onDeepChange(handler: (changes: DeepChangeEvent[]) => void): Unsubscribe;
}
```

### CRDTArray

```typescript
interface CRDTArray<T = unknown> {
  get(index: number): T | undefined;
  insert(index: number, content: T[]): void;
  delete(index: number, length?: number): void;
  push(...items: T[]): void;
  unshift(...items: T[]): void;
  toArray(): T[];
  readonly length: number;

  // Shallow observation
  onChange(handler: (changes: ArrayChangeEvent<T>) => void): Unsubscribe;
  // Deep observation - for arrays containing objects
  onDeepChange(handler: (changes: DeepChangeEvent[]) => void): Unsubscribe;
}
```

### CRDTText

```typescript
interface CRDTText {
  insert(index: number, text: string, attributes?: Record<string, unknown>): void;
  delete(index: number, length: number): void;
  format(index: number, length: number, attributes: Record<string, unknown>): void;
  toString(): string;
  readonly length: number;

  onChange(handler: (changes: TextChangeEvent) => void): Unsubscribe;
}
```

### CRDTCounter

```typescript
interface CRDTCounter {
  increment(delta?: number): void;
  decrement(delta?: number): void;
  readonly value: number;

  onChange(handler: (changes: CounterChangeEvent) => void): Unsubscribe;
}
```

---

## Sync & Transport

```typescript
interface SyncProvider {
  connect(): Promise<void>;
  disconnect(): void;
  readonly connected: boolean;

  onSync(handler: () => void): Unsubscribe;
  onConnectionError(handler: (error: Error) => void): Unsubscribe;
}

interface SyncTransport {
  send(data: Uint8Array): void;
  onReceive(handler: (data: Uint8Array) => void): Unsubscribe;
  connect(): Promise<void>;
  disconnect(): void;
  readonly connected: boolean;
}
```

**Note:** Transports are "dumb pipes" - they just move `Uint8Array` bytes without understanding the content. The sync protocol logic (Yjs uses `y-protocols/sync`, Automerge uses its own sync state machine) lives in `SyncProvider`, which is created by the provider. This means `WebSocketTransport` and `SharedWorkerTransport` are identical for both providers.

---

## Awareness

```typescript
interface Awareness {
  // Local client ID (unique per connection)
  readonly clientId: number;

  // Local user state
  setLocalState(state: AwarenessState | null): void;
  getLocalState(): AwarenessState | null;

  // All connected users' states (keyed by clientId)
  getStates(): Map<number, AwarenessState>;

  // Events
  onChange(handler: (changes: AwarenessChangeEvent) => void): Unsubscribe;

  // Cleanup
  destroy(): void;
}

interface AwarenessState {
  user?: {
    id: string;
    name: string;
    color: string;
    [key: string]: unknown;
  };
  cursor?: {
    [key: string]: unknown;  // Flexible cursor data (position, selection, etc.)
  };
  activity?: string;  // e.g., 'editing', 'viewing', 'idle'
  [key: string]: unknown;  // Extensible for custom state
}

interface AwarenessChangeEvent {
  added: number[];    // clientIds of newly connected users
  updated: number[];  // clientIds of users whose state changed
  removed: number[];  // clientIds of disconnected users
}
```

**Note:** Yjs has built-in awareness via `y-protocols/awareness`. For Automerge, we implement equivalent functionality as a lightweight broadcast system over the same transport - no CRDT needed since awareness is ephemeral (last-write-wins is fine for presence data).

---

## Persistence

```typescript
interface PersistenceProvider {
  load(): Promise<void>;
  save(): Promise<void>;
  clear(): Promise<void>;

  // Auto-save on changes (optional)
  enableAutoSave(debounceMs?: number): void;
  disableAutoSave(): void;
}

interface StorageAdapter {
  get(key: string): Promise<Uint8Array | null>;
  set(key: string, value: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
}
```

---

## Undo/Redo

```typescript
interface UndoManager {
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;

  // Listen for stack changes (to update UI buttons)
  onStackChange(handler: (state: { canUndo: boolean; canRedo: boolean }) => void): Unsubscribe;

  // Cleanup
  destroy(): void;
}

interface UndoManagerOptions {
  // Which origins to track (default: ['user'])
  trackedOrigins?: string[];
  // Group rapid changes into single undo step (default: 500ms)
  captureTimeout?: number;
}

// On CRDTProvider
interface CRDTProvider {
  // ...existing methods...
  createUndoManager(doc: CRDTDoc, options?: UndoManagerOptions): UndoManager;
}
```

**Usage:**

```typescript
// Create undo manager
const undoManager = provider.createUndoManager(doc, {
  trackedOrigins: ['user'],
  captureTimeout: 500,
});

// User makes changes - use 'user' origin to track
doc.transact(() => {
  nodes.set('node-1', { position: { x: 200, y: 100 } });
}, 'user');

// Remote changes - no origin, not tracked for undo
doc.applyUpdate(remoteUpdate);

// Wire up keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    e.shiftKey ? undoManager.redo() : undoManager.undo();
  }
});

// Update UI buttons
undoManager.onStackChange(({ canUndo, canRedo }) => {
  undoButton.disabled = !canUndo;
  redoButton.disabled = !canRedo;
});
```

**Implementation notes:**
- Yjs: Wraps built-in `UndoManager` from `yjs`
- Automerge: Custom implementation using change history / snapshots

**Origin tracking decision (TBD in Phase 1):**

Both providers handle undo tracking differently:
- **Yjs**: Has built-in `trackedOrigins` - only changes with matching origin are tracked
- **Automerge**: No built-in undo, needs custom implementation from scratch

Three options for our abstraction:
1. **Explicit origin (Yjs-like)**: Require `transact(fn, 'user')` for undo tracking
   - Pro: Fine-grained control
   - Con: Verbose, easy to forget
2. **Track all by default**: Track everything unless explicitly excluded
   - Pro: Simple API
   - Con: Remote changes would be tracked (wrong behavior)
3. **Default origin config**: Configure a default origin that's auto-applied
   - Pro: Less verbose for common case
   - Con: Additional complexity

The final approach will be determined during Phase 1 implementation after hands-on experience with both providers.

---

## Key Design Note: Independent Documents

**Each document is independent** - you can create multiple docs, and each one can have:
- Its own sync transport (or none)
- Its own persistence strategy (or none)

This enables use cases like:

```typescript
// Doc A: Source data - syncs to server
const docSource = provider.createDoc('workflow-source');
const serverSync = provider.createSyncProvider(docSource, serverTransport);
const serverPersistence = provider.createPersistenceProvider(docSource, indexedDB);

// Doc B: Large execution data - local only (FE <-> SharedWorker), no server sync
const docExecData = provider.createDoc('execution-data');
const localSync = provider.createSyncProvider(docExecData, sharedWorkerTransport);
// No persistence - too large, ephemeral

// Doc C: Computed/resolved values - local only, no persistence
const docResolved = provider.createDoc('resolved-expressions');
const localSync2 = provider.createSyncProvider(docResolved, sharedWorkerTransport);
// No persistence - recomputed on load
```

```
+-------------+      +------------------+      +------------+
|     FE      | <--> |  SharedWorker    | <--> |   Server   |
|             |      |                  |      |            |
|  docSource -+------+> docSource ------+------+> docSource |
|  docExec ---+------+> docExec         |      |            |
|  docResolved+------+> docResolved     |      |            |
+-------------+      +------------------+      +------------+
                              ^
                     Expression resolver
                     (reads source + exec,
                      writes resolved)
```

---

## Isomorphic Design (FE/BE)

The `@n8n/crdt` package is **isomorphic** - the same code works in both environments:

| Component | Frontend (Browser) | Backend (Node.js) |
|-----------|-------------------|-------------------|
| Core API | Same | Same |
| Data types (Map, Array, Text, Counter) | Same | Same |
| Awareness | Same | Same |
| Sync providers | Same | Same |
| **Transports** | WebSocket, SharedWorker | WebSocket |
| **Persistence** | IndexedDB, Memory | Filesystem, Memory |

The only differences are environment-specific implementations:
- `SharedWorkerTransport` - browser only
- `IndexedDBStorage` - browser only
- `FilesystemStorage` - Node.js only

But the **interfaces are identical**, so FE and BE code looks the same:

```typescript
// Works in both FE and BE
const provider = createCRDTProvider({ engine: 'yjs' });
const doc = provider.createDoc('workflow-123');
const nodes = doc.getMap('nodes');

// Only the transport/storage instantiation differs
const transport = isServer
  ? new WebSocketTransport(serverUrl)
  : new SharedWorkerTransport(worker);
```

---

## Implementation Steps

### Phase 0: Minimal POC (Validate Abstraction)

**Goal:** Prove the abstraction works - both providers produce identical `DeepChangeEvent` output.

**Scope:**
| Include | Exclude (for later) |
|---------|---------------------|
| Map only | Array, Text, Counter |
| `onDeepChange` only | `onChange` (shallow) |
| In-memory only | WebSocket, SharedWorker, persistence |
| No sync | Transport layer |
| No awareness | User presence, cursors |
| Both providers | - |
| Conformance tests | Integration tests, benchmarks |

**Minimal Package Structure:**
```
packages/@n8n/crdt/
+-- package.json
+-- tsconfig.json
+-- src/
|   +-- index.ts
|   +-- types.ts              # Unsubscribe, DeepChangeEvent, CRDTDoc, CRDTMap, CRDTProvider
|   +-- providers/
|   |   +-- yjs.ts            # Single file implementation
|   |   +-- automerge.ts      # Single file implementation
|   +-- factory.ts
+-- test/
    +-- map.conformance.test.ts
```

**Minimal Interfaces:**
```typescript
type Unsubscribe = () => void;

interface DeepChangeEvent {
  path: (string | number)[];
  action: 'add' | 'update' | 'delete';
  value?: unknown;
  oldValue?: unknown;
}

interface CRDTProvider {
  readonly name: string;
  createDoc(id: string): CRDTDoc;
}

interface CRDTDoc {
  readonly id: string;
  getMap<T>(name: string): CRDTMap<T>;
  transact(fn: () => void): void;
  destroy(): void;
}

interface CRDTMap<T = unknown> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  delete(key: string): void;
  has(key: string): boolean;
  toJSON(): Record<string, T>;
  onDeepChange(handler: (changes: DeepChangeEvent[]) => void): Unsubscribe;
}
```

**Tasks:**
1. [x] Create `@n8n/crdt` package with minimal build config
2. [x] Define minimal interfaces in `src/types.ts`
3. [x] Implement `YjsProvider` (doc + map + onDeepChange)
4. [x] Implement `AutomergeProvider` (doc + map + onDeepChange)
5. [x] Create factory function `createCRDTProvider(config)`
6. [x] Write conformance tests ensuring identical `DeepChangeEvent` output

**Success Criteria:** ✅ All met
- Same test code passes for both providers
- `DeepChangeEvent` output is identical for equivalent operations
- Switching provider requires only config change

---

### Phase 1: Core Foundation
1. [x] Add Array type (CRDTArray with nested structure support)
2. [ ] Add Text, Counter types
3. [ ] Add `onChange` (shallow) to all types
4. [x] Add `encodeState()` / `applyUpdate()` to CRDTDoc
5. [x] Add `transact(fn)` support for batching
6. [ ] Add `transact(fn, origin)` support for undo tracking
7. [ ] Implement `UndoManager` for Yjs (wraps built-in)
8. [ ] Implement `UndoManager` for Automerge (custom)
9. [x] Expand conformance tests (304 tests covering Map, Array, sync)

### Phase 2: Sync & Awareness Layer
7. [x] Define transport interface
8. [ ] Implement WebSocket transport
   - [ ] Reconnection with exponential backoff
   - [ ] Heartbeat/ping-pong for stale connection detection
   - [ ] State resync on reconnect (re-send `encodeState()`)
9. [ ] Implement SharedWorker transport
   - [ ] Worker crash detection and recovery
   - [ ] Tab lifecycle handling
10. [x] Implement engine-agnostic sync provider (`BaseSyncProvider`)
11. [x] Write sync conformance tests (included in 304 tests)
12. [ ] Implement Yjs awareness (wraps y-protocols/awareness)
13. [ ] Implement Automerge awareness (custom broadcast implementation)
14. [ ] Write awareness conformance tests

### Phase 3: Persistence Layer (Week 3-4)
16. [ ] Define storage adapter interface
17. [ ] Implement IndexedDB storage adapter (browser)
18. [ ] Implement filesystem storage adapter (Node.js)
19. [ ] Implement memory storage adapter (testing)
20. [ ] Implement Yjs persistence provider
21. [ ] Implement Automerge persistence provider
22. [ ] Write persistence conformance tests

### Phase 4: Integration & Polish
23. [ ] Integration tests with real WebSocket server
24. [ ] Integration tests with SharedWorker
25. [ ] Performance benchmarks comparing providers
26. [ ] Documentation and usage examples
27. [ ] Error handling and edge cases

---

## Consumption Layer Implementation Steps

### Phase 0: Make NodeTypes available in Shared Worker

- Node types are a dependency for all expression resolutions

### Phase 1: Expression resolution and mapping for connections

> **Note:** These expression resolutions don't need access to execution data - it's probably best to do it in the server

- Connections / Handles are computed based on Node types and Node parameters resolution
- Implement mapping connections ↔ handles to match directed graph structure

### Phase 2: Manual workflow execution

- Execution data needs to be available in the shared worker in order to be able to resolve expressions

### Phase 3: Expression resolution based on execution data

- We need access to variables and secrets in the shared worker

### Phase 4: Normalize workflow data to be rendered in VueFlow

---

## Usage Example

```typescript
import { createCRDTProvider } from '@n8n/crdt';
import { WebSocketTransport } from '@n8n/crdt/transports';
import { IndexedDBStorage } from '@n8n/crdt/persistence';

// Create provider (configured via env or config)
const provider = createCRDTProvider({
  engine: 'yjs' // or 'automerge' - switch without code changes
});

console.log(`Using CRDT engine: ${provider.name}`); // For debugging

// Create a document
const doc = provider.createDoc('workflow-123');

// Use data structures
const nodes = doc.getMap<NodeData>('nodes');
const connections = doc.getArray<Connection>('connections');
// const notes = doc.getText('notes'); // Phase 2 - not yet implemented

// Make changes
doc.transact(() => {
  nodes.set('node-1', { type: 'trigger', position: { x: 100, y: 100 } });
  connections.push({ from: 'node-1', to: 'node-2' });
});

// Observe changes (shallow)
const unsubChange = nodes.onChange((event) => {
  console.log('Nodes changed:', event);
});

// Observe changes (deep) - CRITICAL for UI updates
const unsubDeep = nodes.onDeepChange((changes) => {
  for (const change of changes) {
    // change.path = ['node-1', 'position', 'x']
    // change.action = 'update'
    // change.value = 200
    // change.oldValue = 100
    vueFlow.updateNodeData(change.path, change.value);
  }
});

// Cleanup when done
unsubChange();
unsubDeep();

// Setup sync
const transport = new WebSocketTransport('wss://server/sync');
const sync = provider.createSyncProvider(doc, transport);
await sync.connect();

// Setup awareness (user presence)
const awareness = provider.createAwareness(doc, transport);
awareness.setLocalState({
  user: { id: 'user-1', name: 'Alice', color: '#ff0000' },
  cursor: { nodeId: 'node-1', field: 'parameters.value' },
  activity: 'editing'
});

// Listen for other users
const unsubscribeAwareness = awareness.onChange(({ added, updated, removed }) => {
  const allUsers = awareness.getStates();
  console.log('Connected users:', allUsers);
});

// Setup persistence
const storage = new IndexedDBStorage('n8n-crdt');
const persistence = provider.createPersistenceProvider(doc, storage);
await persistence.load();
persistence.enableAutoSave(1000); // Debounced auto-save

// Cleanup
doc.destroy();
```

---

## Configuration

```typescript
// Via environment variable
N8N_CRDT_ENGINE=yjs  # or 'automerge'

// Or programmatically
const provider = createCRDTProvider({
  engine: process.env.N8N_CRDT_ENGINE || 'yjs',
});
```

---

## Testing Strategy

### Conformance Tests
Every feature has tests that run against **both** providers to ensure identical behavior:

```typescript
// test/conformance/map.conformance.test.ts
describe.each(['yjs', 'automerge'])('CRDTMap (%s)', (engine) => {
  let provider: CRDTProvider;
  let doc: CRDTDoc;
  let map: CRDTMap<string>;

  beforeEach(() => {
    provider = createCRDTProvider({ engine });
    doc = provider.createDoc('test');
    map = doc.getMap('test-map');
  });

  it('should set and get values', () => {
    map.set('key', 'value');
    expect(map.get('key')).toBe('value');
  });

  it('should emit change events', () => {
    const handler = jest.fn();
    const unsubscribe = map.onChange(handler);
    map.set('key', 'value');
    expect(handler).toHaveBeenCalled();
    unsubscribe();
  });

  it('should emit deep-change events with correct path', () => {
    const handler = jest.fn();
    const unsubscribe = map.onDeepChange(handler);
    map.set('node-1', { position: { x: 100, y: 200 } });

    // Later, update nested value
    const node = map.get('node-1');
    node.position.x = 150;

    expect(handler).toHaveBeenCalledWith([
      { path: ['node-1', 'position', 'x'], action: 'update', value: 150, oldValue: 100 }
    ]);
    unsubscribe();
  });

  // ... more tests
});
```

---

## Dependencies

```json
{
  "dependencies": {
    "yjs": "^13.6.x",
    "@automerge/automerge": "^2.x"
  },
  "peerDependencies": {
    "y-websocket": "^1.x",  // Optional: for WebSocket sync with Yjs
    "y-indexeddb": "^9.x"   // Optional: for IndexedDB with Yjs
  }
}
```

---

## Files to Create

1. `packages/@n8n/crdt/package.json`
2. `packages/@n8n/crdt/tsconfig.json`
3. `packages/@n8n/crdt/src/index.ts`
4. `packages/@n8n/crdt/src/interfaces/*.ts` (7 files)
5. `packages/@n8n/crdt/src/providers/yjs/*.ts` (9 files)
6. `packages/@n8n/crdt/src/providers/automerge/*.ts` (9 files)
7. `packages/@n8n/crdt/src/transports/*.ts` (4 files)
8. `packages/@n8n/crdt/src/persistence/*.ts` (3 files)
9. `packages/@n8n/crdt/src/factory.ts`
10. `packages/@n8n/crdt/src/config.ts`
11. `packages/@n8n/crdt/test/conformance/*.ts` (9 files)

---

## Consumption Layer

The CRDT abstraction provides the raw data structures. On top of that, you build a **consumption layer** that maintains domain objects (like a `Workflow`) from CRDT changes. This pattern works identically in FE, SharedWorker, and BE.

### WorkflowState Example

```typescript
import type { CRDTMap, DeepChangeEvent } from '@n8n/crdt';

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  parameters: Record<string, unknown>;
}

interface Workflow {
  nodes: Record<string, WorkflowNode>;
  connections: Array<{ from: string; to: string }>;
}

/**
 * Maintains a plain workflow object from CRDT document updates.
 * Works identically in FE, SharedWorker, and BE.
 */
class WorkflowState {
  private workflow: Workflow = { nodes: {}, connections: [] };

  constructor(
    private nodesMap: CRDTMap<WorkflowNode>,
    private connectionsArray: CRDTArray<Connection>
  ) {
    // Initialize from current state
    this.workflow.nodes = nodesMap.toJSON();
    this.workflow.connections = connectionsArray.toArray();

    // Subscribe to changes
    nodesMap.onDeepChange(this.handleNodesChange.bind(this));
    connectionsArray.onChange(this.handleConnectionsChange.bind(this));
  }

  private handleNodesChange(changes: DeepChangeEvent[]) {
    for (const change of changes) {
      const [nodeId, ...rest] = change.path;

      if (rest.length === 0) {
        // Top-level node add/delete
        if (change.action === 'add' || change.action === 'update') {
          this.workflow.nodes[nodeId as string] = change.value as WorkflowNode;
        } else if (change.action === 'delete') {
          delete this.workflow.nodes[nodeId as string];
        }
      } else {
        // Nested property change (e.g., ['node-1', 'position', 'x'])
        this.setNestedValue(this.workflow.nodes[nodeId as string], rest, change.value);
      }
    }
  }

  private handleConnectionsChange(event: ArrayChangeEvent) {
    // Rebuild connections array (or apply delta)
    this.workflow.connections = this.connectionsArray.toArray();
  }

  private setNestedValue(obj: unknown, path: (string | number)[], value: unknown) {
    let current = obj as Record<string, unknown>;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]] as Record<string, unknown>;
    }
    current[path[path.length - 1]] = value;
  }

  // Read-only access to current state
  getWorkflow(): Readonly<Workflow> {
    return this.workflow;
  }

  getNode(id: string): WorkflowNode | undefined {
    return this.workflow.nodes[id];
  }
}
```

### Usage in Different Contexts

```typescript
// Same code works everywhere
const provider = createCRDTProvider({ engine: 'yjs' });
const doc = provider.createDoc('workflow-123');

const workflowState = new WorkflowState(
  doc.getMap('nodes'),
  doc.getArray('connections')
);

// Always up-to-date, no matter where changes come from
const currentWorkflow = workflowState.getWorkflow();
```

### In SharedWorker (Expression Resolution)

```typescript
// SharedWorker maintains the state and computes resolved expressions
class ExpressionResolver {
  constructor(
    private workflowState: WorkflowState,
    private executionData: CRDTMap<ExecutionData>,
    private resolvedDoc: CRDTDoc
  ) {
    // Re-resolve when source data changes
    workflowState.nodesMap.onDeepChange(() => this.resolveAll());
    executionData.onDeepChange(() => this.resolveAll());
  }

  private resolveAll() {
    const workflow = this.workflowState.getWorkflow();
    const execData = this.executionData.toJSON();
    const resolved = this.resolvedDoc.getMap('resolved');

    for (const [nodeId, node] of Object.entries(workflow.nodes)) {
      const resolvedParams = this.resolveExpressions(node.parameters, execData);
      resolved.set(nodeId, resolvedParams);
    }
  }
}
```

### Key Points

1. **CRDT layer** = raw collaborative data structures
2. **Consumption layer** = domain-specific state derived from CRDT changes
3. **Same pattern** works in FE (Vue/Pinia), SharedWorker, and BE
4. **Deep change events** make incremental updates efficient (no diffing needed)
5. **Provider-agnostic** - switching Yjs/Automerge doesn't affect consumption layer
