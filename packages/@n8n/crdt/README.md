# @n8n/crdt

CRDT abstraction layer for n8n collaborative editing. Provides a unified API
over Yjs and Automerge CRDT libraries.

## Status

**Phase 1 Complete** - Core data structures (Map, Array) and sync infrastructure
are functional with 300+ passing conformance tests.

See [crdt-poc.md](./crdt-poc.md) for full documentation and roadmap.

## Quick Start

```typescript
import { createCRDTProvider, CRDTEngine } from '@n8n/crdt';

// Create provider (switch engine without code changes)
const provider = createCRDTProvider({ engine: CRDTEngine.yjs });

// Create document
const doc = provider.createDoc('workflow-123');

// Use data structures
const nodes = doc.getMap('nodes');
nodes.set('node-1', { position: { x: 100, y: 200 } });

// Access nested structures
const node = nodes.get('node-1') as CRDTMap<unknown>;
const position = node.get('position') as CRDTMap<number>;
position.set('x', 150); // Fine-grained update

// Observe deep changes
nodes.onDeepChange((changes) => {
    for (const change of changes) {
        console.log(change.path, change.action, change.value);
        // ['node-1', 'position', 'x'], 'update', 150
    }
});
```

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

## Provider Differences

While the API is unified, some edge-case behaviors differ between providers:

| Behavior | Yjs | Automerge |
|----------|-----|-----------|
| Array out-of-bounds index | Throws `RangeError` | Clamps to valid range |

For portable code, always use valid indices (`0 <= index <= length`).
