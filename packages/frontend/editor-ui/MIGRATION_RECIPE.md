# Node Migration Recipe

Migrate files from direct `workflowsStore` / `workflowState` node access to `workflowDocumentStore`.

## API Mapping

### Read accessors

| Before | After (`workflowDocumentStore`) |
|---|---|
| `workflowsStore.allNodes` | `.allNodes` |
| `workflowsStore.nodesByName` | `.nodesByName` |
| `workflowsStore.getNodeById(id)` | `.getNodeById(id)` |
| `workflowsStore.getNodeByName(name)` | `.getNodeByName(name)` |
| `workflowsStore.getNodes()` | `.getNodes()` |
| `workflowsStore.getNodesByIds(ids)` | `.getNodesByIds(ids)` |
| `workflowsStore.workflow.nodes` (direct — includes `.find()`, `.findIndex()`, `.length`, `.map()`, `= [...]` assignment) | `.allNodes` (for reads), `.setNodes()` (for assignment) |
| `workflowsStore.canvasNames` | `.canvasNames` |
| `workflowsStore.findNodeByPartialId(id)` | `.findNodeByPartialId(id)` |

### Collection mutations

| Before | After (`workflowDocumentStore`) |
|---|---|
| `workflowsStore.setNodes(nodes)` | `.setNodes(nodes)` |
| `workflowsStore.addNode(node)` | `.addNode(node)` |
| `workflowsStore.removeNode(node)` | `.removeNode(node)` |
| `workflowsStore.removeNodeById(id)` | `.removeNodeById(id)` |
| `workflowState.removeAllNodes(opts)` | `.removeAllNodes(opts)` |

### Per-node mutations

| Before | After (`workflowDocumentStore`) |
|---|---|
| `workflowState.setNodeParameters(...)` | `.setNodeParameters(...)` |
| `workflowState.setNodeValue(...)` | `.setNodeValue(...)` |
| `workflowState.setNodePositionById(...)` | `.setNodePositionById(...)` |
| `workflowState.updateNodeProperties(...)` | `.updateNodeProperties(...)` |
| `workflowState.updateNodeById(...)` | `.updateNodeById(...)` |
| `workflowState.setNodeIssue(...)` | `.setNodeIssue(...)` |
| `workflowState.resetAllNodesIssues()` | `.resetAllNodesIssues()` |
| `workflowState.setLastNodeParameters(...)` | `.setLastNodeParameters(...)` |
| `workflowState.resetParametersLastUpdatedAt(...)` | `.resetParametersLastUpdatedAt(...)` |
| `workflowState.updateNodeAtIndex(idx, data)` | `.updateNodeById(id, data)` — same semantics, pass node ID instead of index. `updateNodeAtIndex` exists in the facade as an internal helper but is not exposed publicly. |

## Migration guidelines

- **Always name the variable `workflowDocumentStore`.** Never abbreviate to `docStore`, `wds`, `documentStore`, or any other shorthand. The canonical name is `workflowDocumentStore` — in production code, tests, and local variables alike. This keeps the codebase grep-friendly and avoids confusion with other stores.
- **Migrate all guarded APIs per file together.** When migrating a file, replace ALL `workflowsStore` reads AND `workflowState` mutations in one pass. Don't leave some calls on the old API — partial migrations make the code harder to follow and the ESLint warnings will remain.
- **Each ticket lists both surfaces.** The "Facade methods used" section covers `workflowsStore` reads; the "`workflowState` migration" section covers per-node mutations. Both need to move to `workflowDocumentStore`.
- **Consolidate existing inline `useWorkflowDocumentStore()` calls.** Some files may already have partial migrations (e.g. for `usedCredentials` or `pinData`). When you add the computed accessor, consolidate all inline calls into the single computed. Pinia deduplicates store instances by ID, so this is always safe.
- **Remove dead `workflowState` parameters after migration.** If a composable accepts `workflowState` only for node mutations (e.g. `setNodeIssue`, `updateNodeProperties`), migrating those to `workflowDocumentStore` makes the parameter dead. Remove it from the signature and update all callers. Keep `workflowState` only if the composable still uses non-node-document properties like `executingNode`.
- **Update callers when signatures change.** Removing a parameter or changing a composable's signature is a cascading change — grep for all call sites and update them. Check both production code and tests.
- **Fix downstream test spies.** Tests for *consumers* of a migrated composable may spy on `workflowState.updateNodeProperties` (or similar) to assert behavior. After migration, the composable calls `workflowDocumentStore` instead, so those spies see zero calls. Grep for the method name across all test files — not just the ones for the file you migrated.

## Access Patterns

### 1. Vue components inside WorkflowLayout

Components rendered inside the `WorkflowLayout` tree (canvas, NDV, node settings, etc.) use the injected store:

```ts
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

const workflowDocumentStore = injectWorkflowDocumentStore();

// Usage — inject returns ShallowRef<Store | null>, so ?.value?. chain
workflowDocumentStore?.value?.allNodes ?? []
workflowDocumentStore?.value?.getNodeById(id)
workflowDocumentStore?.value?.getNodeByName(name)
```

### 2. Pinia stores and composables outside WorkflowLayout

Code outside the WorkflowLayout tree (stores, standalone composables, utils) uses a computed accessor:

```ts
import { useWorkflowDocumentStore, createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';

const workflowDocumentStore = computed(() =>
  workflowsStore.workflowId
    ? useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId))
    : undefined,
);

// Usage — computed wraps the store, so .value?. chain
workflowDocumentStore.value?.allNodes ?? []
workflowDocumentStore.value?.getNodeById(id)
workflowDocumentStore.value?.getNodeByName(name)
```

### 3. Standalone exported functions (no reactive context)

Some files export plain functions (not composables or components) that are called imperatively — e.g. push connection handlers. These have no Vue reactive setup context, so `computed()` won't work. Construct the store inline at call time:

```ts
import { useWorkflowDocumentStore, createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';

function handleSomeEvent() {
  const workflowsStore = useWorkflowsStore();
  const workflowDocumentStore = workflowsStore.workflowId
    ? useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId))
    : undefined;

  const node = workflowDocumentStore?.getNodeByName(name) ?? null;
}
```

### Fallback values

Since `workflowDocumentStore` can be `undefined` (no workflow loaded), always provide a fallback:

| Return type | Fallback |
|---|---|
| Array (`.allNodes`, `.getNodes()`, `.getNodesByIds()`) | `?? []` |
| Single node (`.getNodeById()`, `.getNodeByName()`, `.findNodeByPartialId()`) | `?? null` |
| Map/Record (`.nodesByName`, `.canvasNames`) | `?? {}` |
| Void mutations (`.setNodeIssue()`, `.updateNodeProperties()`, etc.) | Optional chaining only (`?.`) — no fallback needed |

## Test Patterns

### Component / composable tests (inside WorkflowLayout)

Mock `injectWorkflowDocumentStore` and return a real store:

```ts
import { injectWorkflowDocumentStore, useWorkflowDocumentStore, createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';

vi.mock('@/app/stores/workflowDocument.store', async () => {
  const actual = await vi.importActual('@/app/stores/workflowDocument.store');
  return { ...actual, injectWorkflowDocumentStore: vi.fn() };
});

beforeEach(() => {
  workflowsStore.workflow.id = 'test-workflow';
  vi.mocked(injectWorkflowDocumentStore).mockReturnValue(
    shallowRef(useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId))),
  );
});
```

### Store tests (computed pattern)

Mock the store factory:

```ts
const { mockDocumentStore } = vi.hoisted(() => ({
  mockDocumentStore: {
    allNodes: [],
    getNodeById: vi.fn(),
    getNodeByName: vi.fn(),
    // ... only the methods your test needs
  },
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
  useWorkflowDocumentStore: vi.fn().mockReturnValue(mockDocumentStore),
  createWorkflowDocumentId: vi.fn().mockReturnValue('test-id'),
}));
```

### Fixing `mockedStore` + `allNodes` detachment

If tests use `mockedStore(useWorkflowsStore)`, the `allNodes` computed gets detached from `workflow.nodes`. Fix by wiring it back:

```ts
Object.defineProperty(workflowsStore, 'allNodes', {
  get: () => workflowsStore.workflow.nodes,
  configurable: true,
});
```

## What NOT to migrate

- **`workflowsStore.workflowObject`** (39 files) — provides indirect node access via `Workflow` class methods (`.getNode()`, `.nodes`, `.getParentNodes()`, etc.). This is intentionally NOT migrated until both nodes **and** connections move to `workflowDocumentStore`. No ESLint guard for this — it's accepted tech debt.
- **Execution-related methods** (e.g., `renameNodeSelectedAndExecution`, `removeNodeExecutionDataById`) — these are not node document state
- **`workflowState.executingNode`** and other execution-state properties — these are not node document state

## Maintaining this recipe

Update this file when a migration reveals a new pattern, edge case, or pitfall that would save the next person time. Don't add noise — only document something if you had to figure it out and it wasn't already covered above.
