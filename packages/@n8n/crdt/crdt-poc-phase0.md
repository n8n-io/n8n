# CRDT Phase 0: Detailed Implementation Steps

This document breaks down Phase 0 from [crdt-poc.md](./crdt-poc.md) into smaller, incremental steps.

**Goal:** Prove the abstraction works - both providers produce identical `DeepChangeEvent` output.

---

## Step 0.1: Package Scaffolding

Create the bare package structure without any implementation.

**Tasks:**
- [ ] Create `packages/@n8n/crdt/package.json` with dependencies (yjs, @automerge/automerge)
- [ ] Create `packages/@n8n/crdt/tsconfig.json` extending base config
- [ ] Create `packages/@n8n/crdt/src/index.ts` (empty exports)
- [ ] Add package to pnpm workspace
- [ ] Verify `pnpm install` and `pnpm build` work

**Deliverable:** Empty package that builds successfully.

---

## Step 0.2: Core Type Definitions

Define the interfaces without any implementation.

**Tasks:**
- [ ] Create `src/types.ts` with:
  - `Unsubscribe` type
  - `DeepChangeEvent` interface
  - `CRDTProvider` interface
  - `CRDTDoc` interface
  - `CRDTMap` interface
- [ ] Export types from `src/index.ts`
- [ ] Verify types compile

**Deliverable:** Type definitions that compile, importable from `@n8n/crdt`.

---

## Step 0.3: Yjs Provider - Basic Doc & Map (no events)

Implement Yjs provider with basic CRUD operations, no change events yet.

**Tasks:**
- [ ] Create `src/providers/yjs.ts`
- [ ] Implement `YjsDoc` class:
  - `id` property
  - `getMap<T>(name)` - returns cached `YjsMap` instances
  - `transact(fn)` - wraps `Y.Doc.transact()`
  - `destroy()` - calls `Y.Doc.destroy()`
- [ ] Implement `YjsMap` class:
  - `get(key)`, `set(key, value)`, `delete(key)`, `has(key)`
  - `toJSON()` - returns plain object snapshot
  - `onDeepChange()` - stub returning no-op unsubscribe
- [ ] Implement `YjsProvider` class:
  - `name` = 'yjs'
  - `createDoc(id)` - returns `YjsDoc`

**Deliverable:** Working Yjs CRUD operations (manually testable).

---

## Step 0.4: Yjs Provider - Deep Change Events

Add `onDeepChange` implementation for Yjs.

**Tasks:**
- [ ] Implement `YjsMap.onDeepChange()`:
  - Use `Y.Map.observeDeep()` to capture nested changes
  - Convert Yjs events to `DeepChangeEvent[]` format
  - Handle add/update/delete actions
  - Compute correct `path` for nested changes
  - Track `oldValue` where possible
- [ ] Handle unsubscribe cleanup

**Deliverable:** Yjs emits correct `DeepChangeEvent` for all map operations.

---

## Step 0.5: Basic Conformance Test Setup

Set up test infrastructure that will run against both providers.

**Tasks:**
- [ ] Create `test/conformance/map.conformance.test.ts`
- [ ] Set up `describe.each(['yjs'])` pattern (Automerge added later)
- [ ] Write basic tests:
  - `set()` and `get()` work correctly
  - `delete()` removes keys
  - `has()` returns correct boolean
  - `toJSON()` returns snapshot
- [ ] Verify tests pass for Yjs

**Deliverable:** Test infrastructure ready, passing for Yjs.

---

## Step 0.6: Deep Change Event Conformance Tests

Add tests specifically for `onDeepChange` behavior.

**Tasks:**
- [ ] Test: adding a key emits `{ action: 'add', path: [key], value }`
- [ ] Test: updating a key emits `{ action: 'update', path: [key], value, oldValue }`
- [ ] Test: deleting a key emits `{ action: 'delete', path: [key], oldValue }`
- [ ] Test: nested object change emits correct path (e.g., `['node-1', 'position', 'x']`)
- [ ] Test: multiple changes in transaction emit single event batch
- [ ] Test: unsubscribe stops events

**Deliverable:** Comprehensive deep change tests, passing for Yjs.

---

## Step 0.7: Automerge Provider - Basic Doc & Map (no events)

Implement Automerge provider with basic CRUD, mirroring Yjs structure.

**Tasks:**
- [ ] Create `src/providers/automerge.ts`
- [ ] Implement `AutomergeDoc` class:
  - Wraps `Automerge.init()` / `Automerge.change()`
  - `getMap<T>(name)` - returns `AutomergeMap` wrapper
  - `transact(fn)` - batches changes in single `Automerge.change()`
  - `destroy()` - cleanup
- [ ] Implement `AutomergeMap` class:
  - `get(key)`, `set(key, value)`, `delete(key)`, `has(key)`
  - `toJSON()` - returns plain object snapshot
  - `onDeepChange()` - stub returning no-op unsubscribe

**Deliverable:** Working Automerge CRUD operations.

---

## Step 0.8: Automerge Provider - Deep Change Events

Add `onDeepChange` implementation for Automerge.

**Tasks:**
- [ ] Implement change tracking in `AutomergeDoc.transact()`:
  - Use `Automerge.getChanges()` or patch observation
  - Convert Automerge patches to `DeepChangeEvent[]` format
- [ ] Implement `AutomergeMap.onDeepChange()`:
  - Subscribe to doc-level changes
  - Filter to relevant map changes
  - Emit normalized `DeepChangeEvent[]`
- [ ] Ensure event format matches Yjs exactly

**Deliverable:** Automerge emits correct `DeepChangeEvent` for all map operations.

---

## Step 0.9: Factory Function

Create the provider factory for easy switching.

**Tasks:**
- [ ] Create `src/factory.ts`
- [ ] Implement `createCRDTProvider(config)`:
  ```typescript
  function createCRDTProvider(config: { engine: 'yjs' | 'automerge' }): CRDTProvider
  ```
- [ ] Export from `src/index.ts`

**Deliverable:** Single entry point for creating providers.

---

## Step 0.10: Full Conformance Test Suite

Enable Automerge in conformance tests and verify identical behavior.

**Tasks:**
- [ ] Update `describe.each(['yjs', 'automerge'])` in all conformance tests
- [ ] Run full test suite against both providers
- [ ] Fix any discrepancies in event format between providers
- [ ] Document any intentional differences (if any)

**Deliverable:** All conformance tests pass for both Yjs and Automerge.

---

## Success Criteria

- [ ] Same test code passes for both providers
- [ ] `DeepChangeEvent` output is identical for equivalent operations
- [ ] Switching provider requires only config change
