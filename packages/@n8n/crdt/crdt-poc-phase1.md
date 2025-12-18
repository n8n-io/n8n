# CRDT Phase 1: Sync & Transport Layer

**Goal:** Prove the sync abstraction works - two or more documents synchronize changes via pluggable transports.

**Prerequisite:** Phase 0 complete (Map + onDeepChange working for both providers)

---

## Step 1.1: Add `encodeState()` to CRDTDoc

Add method to serialize the full document state.

**Interface change:**
```typescript
interface CRDTDoc {
  // ... existing
  encodeState(): Uint8Array;
}
```

**Tasks:**
- [ ] Add `encodeState()` to `CRDTDoc` interface in `types.ts`
- [ ] Implement in `YjsDoc` using `Y.encodeStateAsUpdate(doc)`
- [ ] Implement in `AutomergeDoc` using `Automerge.save(doc)`
- [ ] Add unit test: encode empty doc returns non-empty Uint8Array
- [ ] Add unit test: encode doc with data returns larger Uint8Array

**Deliverable:** Both providers can serialize their state.

---

## Step 1.2: Add `applyUpdate()` to CRDTDoc

Add method to apply an update (or full state) from another doc.

**Interface change:**
```typescript
interface CRDTDoc {
  // ... existing
  applyUpdate(update: Uint8Array): void;
}
```

**Tasks:**
- [ ] Add `applyUpdate()` to `CRDTDoc` interface in `types.ts`
- [ ] Implement in `YjsDoc` using `Y.applyUpdate(doc, update)`
- [ ] Implement in `AutomergeDoc` using `Automerge.merge()` or `Automerge.loadIncremental()`
- [ ] Add unit test: apply update from another doc merges data
- [ ] Add unit test: apply same update twice is idempotent

**Deliverable:** Both providers can apply external updates.

---

## Step 1.3: Add `onUpdate()` to CRDTDoc

Add method to subscribe to outgoing updates (for sending to peers).

**Interface change:**
```typescript
interface CRDTDoc {
  // ... existing
  onUpdate(handler: (update: Uint8Array, origin: unknown) => void): Unsubscribe;
}
```

**Tasks:**
- [ ] Add `onUpdate()` to `CRDTDoc` interface in `types.ts`
- [ ] Implement in `YjsDoc` using `doc.on('update', handler)`
- [ ] Implement in `AutomergeDoc` - emit after each `change()` call
- [ ] Add unit test: handler called when doc changes
- [ ] Add unit test: handler receives Uint8Array that can be applied to another doc
- [ ] Add unit test: unsubscribe stops handler calls

**Deliverable:** Both providers emit updates when data changes.

---

## Step 1.4: Two-Doc Sync Conformance Test (Manual Sync)

Test that two docs can sync by manually passing updates between them.

**Tasks:**
- [ ] Create `src/sync.test.ts` for sync conformance tests
- [ ] Test: Doc A changes, encode update, apply to Doc B, both have same state
- [ ] Test: Doc B changes, encode update, apply to Doc A, both have same state
- [ ] Test: Both docs change different keys, exchange updates, both converge
- [ ] Test: Both docs change same key (conflict), exchange updates, both converge to same value
- [ ] Run tests against both Yjs and Automerge

**Deliverable:** Manual sync works for both providers with identical behavior.

---

## Step 1.5: Define `SyncTransport` Interface

Define the transport interface - a "dumb pipe" for moving bytes.

**New file:** `src/transports/transport.interface.ts`

```typescript
export type Unsubscribe = () => void;

export interface SyncTransport {
  send(data: Uint8Array): void;
  onReceive(handler: (data: Uint8Array) => void): Unsubscribe;
  connect(): Promise<void>;
  disconnect(): void;
  readonly connected: boolean;
}
```

**Tasks:**
- [ ] Create `src/transports/` directory
- [ ] Create `transport.interface.ts` with `SyncTransport` interface
- [ ] Export from `src/index.ts`

**Deliverable:** Transport interface defined and exported.

---

## Step 1.6: Implement `MockTransport`

Create a mock transport for testing that connects two endpoints directly.

**New file:** `src/transports/mock.transport.ts`

**Tasks:**
- [ ] Implement `MockTransport` class implementing `SyncTransport`
- [ ] Add static `createPair()` method that returns two connected transports
- [ ] `send()` on one delivers to `onReceive` handler on the other
- [ ] Add configurable delay option (default: 0ms, synchronous)
- [ ] Add unit tests for MockTransport behavior
- [ ] Export from `src/index.ts`

**Deliverable:** MockTransport that can connect two docs for testing.

---

## Step 1.7: Define `SyncProvider` Interface

Define the sync provider interface - handles sync protocol logic.

**Interface:**
```typescript
export interface SyncProvider {
  connect(): Promise<void>;
  disconnect(): void;
  readonly connected: boolean;
  onSync(handler: () => void): Unsubscribe;
  onError(handler: (error: Error) => void): Unsubscribe;
  destroy(): void;
}
```

**Add to CRDTProvider:**
```typescript
interface CRDTProvider {
  // ... existing
  createSyncProvider(doc: CRDTDoc, transport: SyncTransport): SyncProvider;
}
```

**Tasks:**
- [ ] Add `SyncProvider` interface to `types.ts`
- [ ] Add `createSyncProvider()` to `CRDTProvider` interface
- [ ] Export from `src/index.ts`

**Deliverable:** SyncProvider interface defined.

---

## Step 1.8: Implement Yjs `SyncProvider`

Implement sync for Yjs using y-protocols.

**Tasks:**
- [ ] Add `y-protocols` dependency to package.json
- [ ] Create `YjsSyncProvider` class in `src/providers/yjs.ts`
- [ ] Use `y-protocols/sync` for sync message encoding/decoding
- [ ] On connect: send sync step 1
- [ ] On receive: process message, respond with sync step 2 if needed
- [ ] Subscribe to doc updates, send to transport
- [ ] Implement `onSync` callback (fires when initial sync complete)
- [ ] Implement `onError` callback
- [ ] Add `createSyncProvider()` to `YjsProvider`

**Deliverable:** Yjs docs can sync via transport.

---

## Step 1.9: Implement Automerge `SyncProvider`

Implement sync for Automerge using its sync protocol.

**Tasks:**
- [ ] Create `AutomergeSyncProvider` class in `src/providers/automerge.ts`
- [ ] Use `Automerge.generateSyncMessage()` and `Automerge.receiveSyncMessage()`
- [ ] Maintain sync state per connection
- [ ] On connect: generate and send initial sync message
- [ ] On receive: process message, generate response if needed
- [ ] Implement `onSync` callback (fires when sync state indicates synced)
- [ ] Implement `onError` callback
- [ ] Add `createSyncProvider()` to `AutomergeProvider`

**Deliverable:** Automerge docs can sync via transport.

---

## Step 1.10: Two-Doc Sync via Transport Conformance Test

Test that two docs sync via MockTransport.

**Tasks:**
- [ ] Test: Create two docs, connect via MockTransport pair, changes sync both ways
- [ ] Test: One doc has existing data, new doc connects, receives full state
- [ ] Test: Both docs have different data, connect, both converge
- [ ] Test: Disconnect, make changes, reconnect, changes sync
- [ ] Test: `onSync` fires when initial sync completes
- [ ] Run tests against both Yjs and Automerge

**Deliverable:** Transport-based sync works for both providers.

---

## Step 1.11: Three-Doc Chain Sync Test

Test UI ↔ SharedWorker ↔ Server topology with three docs.

```
[Doc A] <--transport--> [Doc B] <--transport--> [Doc C]
  (UI)                  (Worker)                (Server)
```

**Tasks:**
- [ ] Create three docs: A, B, C
- [ ] Connect A ↔ B with one MockTransport pair
- [ ] Connect B ↔ C with another MockTransport pair
- [ ] Test: Change in A propagates to B then to C
- [ ] Test: Change in C propagates to B then to A
- [ ] Test: Changes in A and C converge in all three docs
- [ ] Run tests against both Yjs and Automerge

**Deliverable:** Three-way sync chain works, proving UI ↔ Worker ↔ Server topology.

---

## Step 1.12: Concurrent Edit Conflict Test

Test that concurrent edits on the same key resolve consistently.

**Tasks:**
- [ ] Create two docs, connect via transport
- [ ] Disconnect transport (simulate offline)
- [ ] Doc A sets key 'x' to 'A'
- [ ] Doc B sets key 'x' to 'B'
- [ ] Reconnect transport
- [ ] Verify both docs converge to same value
- [ ] Verify the value is deterministic (same winner every time)
- [ ] Run tests against both Yjs and Automerge

**Deliverable:** Conflict resolution works consistently for both providers.

---

## Success Criteria

- [ ] `encodeState()`, `applyUpdate()`, `onUpdate()` work for both providers
- [ ] `MockTransport` enables doc-to-doc sync testing
- [ ] `SyncProvider` abstracts Yjs and Automerge sync protocols
- [ ] Two-doc sync conformance tests pass for both providers
- [ ] Three-doc chain sync (UI ↔ Worker ↔ Server) works
- [ ] Concurrent edit conflicts resolve consistently
- [ ] All conformance tests produce identical behavior for both providers

---

## Files to Create/Modify

**Modify:**
- `src/types.ts` - Add `encodeState`, `applyUpdate`, `onUpdate`, `SyncProvider`
- `src/providers/yjs.ts` - Implement new methods + `YjsSyncProvider`
- `src/providers/automerge.ts` - Implement new methods + `AutomergeSyncProvider`
- `src/index.ts` - Export new types and transports
- `package.json` - Add `y-protocols` dependency

**Create:**
- `src/transports/transport.interface.ts`
- `src/transports/mock.transport.ts`
- `src/transports/index.ts`
- `src/sync.test.ts`

---

## Dependencies to Add

```json
{
  "dependencies": {
    "y-protocols": "^1.0.6"
  }
}
```
