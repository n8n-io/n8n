# @n8n/crdt

CRDT abstraction layer for n8n collaborative editing. Provides a unified API
built on Yjs for real-time document synchronization.

## Quick Start

```typescript
import { createCRDTProvider, CRDTEngine } from '@n8n/crdt';

// Create provider
const provider = createCRDTProvider({ engine: CRDTEngine.yjs });

// Create document
const doc = provider.createDoc('workflow-123');

// Use data structures
const nodes = doc.getMap('nodes');
nodes.set('node-1', { position: { x: 100, y: 200 } });

// Plain objects are returned as-is (no automatic CRDT wrapping)
const node = nodes.get('node-1'); // Returns { position: { x: 100, y: 200 } }

// To update nested data, replace the whole object
nodes.set('node-1', { position: { x: 150, y: 200 } });

// Observe changes
nodes.onDeepChange((changes) => {
    for (const change of changes) {
        console.log(change.path, change.action, change.value);
        // ['node-1'], 'update', { position: { x: 150, y: 200 } }
    }
});
```

## Plain Objects and Sync

Plain objects stored in CRDT structures **do sync** across peers, but they sync as
**atomic values** (last-write-wins), not as collaborative structures:

```typescript
// Both peers start synced
mapA.set('node', { x: 100, y: 200 });
// After sync: mapB.get('node') → { x: 100, y: 200 }

// Concurrent edits to the same key = conflict (one wins)
mapA.set('node', { x: 150, y: 200 });  // Peer A changes x
mapB.set('node', { x: 100, y: 250 });  // Peer B changes y
// After sync: both get { x: 150, y: 200 } OR { x: 100, y: 250 }
// One write wins entirely - changes are NOT merged

// For fine-grained collaborative editing, use explicit CRDT structures:
const nodeX = doc.getMap('node-x');  // Separate CRDT map for x values
const nodeY = doc.getMap('node-y');  // Separate CRDT map for y values
```

This "no magic" design matches raw Yjs behavior and keeps the API predictable.

## Sync

```typescript
import { createSyncProvider, MockTransport } from '@n8n/crdt';

// Create linked transports
const transportA = new MockTransport();
const transportB = new MockTransport();
MockTransport.link(transportA, transportB);

// Create sync providers
const syncA = createSyncProvider(docA, transportA);
const syncB = createSyncProvider(docB, transportB);

// Start sync
await syncA.start();
await syncB.start();

// Changes now propagate automatically
```

## API

### Core Types

- `CRDTProvider` - Factory for creating documents
- `CRDTDoc` - Document container with `getMap()`, `getArray()`, `transact()`
- `CRDTMap<T>` - Key-value CRDT structure with deep change observation
- `CRDTArray<T>` - Ordered list CRDT structure

### Change Events

- `DeepChangeEvent` - Map changes with `path`, `action`, `value`, `oldValue`
- `ArrayChangeEvent` - Array changes in Quill delta format (`retain`, `insert`, `delete`)

### Sync

- `SyncProvider` - Manages document synchronization
- `SyncTransport` - Transport interface for moving binary data
- `MockTransport` - In-memory transport for testing
- `MessagePortTransport` - SharedWorker/Worker/MessageChannel communication
- `WebSocketTransport` - Server sync with auto-reconnect

## Transports

All transports implement the same `SyncTransport` interface:

```typescript
interface SyncTransport {
  send(data: Uint8Array): void;
  onReceive(handler: (data: Uint8Array) => void): Unsubscribe;
  connect(): Promise<void>;
  disconnect(): void;
  readonly connected: boolean;
}
```

### WebSocket Transport

```typescript
import { WebSocketTransport, createSyncProvider } from '@n8n/crdt';

const transport = new WebSocketTransport({
  url: 'wss://server/sync',
  reconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 10,
});

transport.onConnectionChange((connected) => {
  console.log('Connection state:', connected);
});

const sync = createSyncProvider(doc, transport);
await sync.start();
```

### MessagePort Transport (SharedWorker)

```typescript
import { MessagePortTransport, createSyncProvider } from '@n8n/crdt';

// In main thread
const worker = new SharedWorker('worker.js');
const transport = new MessagePortTransport(worker.port);
const sync = createSyncProvider(doc, transport);
await sync.start();
```

## Not Yet Implemented

The following CRDT types are not yet part of this abstraction:

- **Text** - For collaborative text editing (rich text, code editors)
- **Counter** - For conflict-free increment/decrement operations

These can be added in future phases if needed.
