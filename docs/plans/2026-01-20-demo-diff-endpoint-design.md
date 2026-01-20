# Design: Expose `/demo/diff` Endpoint for Workflow Comparison

**Linear Ticket:** [AI-1638](https://linear.app/n8n/issue/AI-1638)
**Date:** 2026-01-20

## Overview

Add a new `/demo/diff` endpoint to display side-by-side workflow comparisons for the Lovable prompt viewer app. Also add "tidy up" support to both `/demo/diff` and existing `/demo` endpoints.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Shared Components                             │
├─────────────────────────────────────────────────────────────────┤
│  WorkflowDiffView.vue (NEW)                                     │
│  - Side-by-side canvases with "Before"/"After" labels           │
│  - Sync views toggle, prev/next navigation                      │
│  - Node click → side panel with JSON diff                       │
│  - Receives workflows as props (source-agnostic)                │
└─────────────────────────────────────────────────────────────────┘
              ▲                              ▲
              │                              │
┌─────────────┴─────────────┐  ┌─────────────┴─────────────┐
│  WorkflowDiffModal.vue    │  │  DemoDiffView.vue (NEW)   │
│  (existing, refactored)   │  │                           │
│  - Fetches from source    │  │  - Route: /demo/diff      │
│    control store          │  │  - Receives workflows via │
│  - Modal wrapper          │  │    postMessage            │
│  - Push/pull direction    │  │  - DemoLayout wrapper     │
└───────────────────────────┘  └───────────────────────────┘
```

**Key principle:** `WorkflowDiffView` is a pure presentational component that takes `oldWorkflow` and `newWorkflow` as props. The data source (source control vs postMessage) is handled by the parent.

## PostMessage API

### For `/demo/diff` - new command

```typescript
{
  command: 'openDiff',
  oldWorkflow: IWorkflowDb,
  newWorkflow: IWorkflowDb,
  tidyUp?: 'always' | 'if-missing'
}
```

### For `/demo` - extend existing command

```typescript
{
  command: 'openWorkflow',
  ...workflowData,
  canOpenNDV?: boolean,
  hideNodeIssues?: boolean,
  tidyUp?: 'always' | 'if-missing'   // NEW field
}
```

### Tidy-up Options

| Option | Behavior |
|--------|----------|
| `undefined` | No tidy up (default) |
| `'always'` | Always apply tidy up |
| `'if-missing'` | Tidy up only if ALL nodes are missing the `position` property |

## File Structure

### New Files

```
packages/frontend/editor-ui/src/
├── features/workflows/workflowDiff/
│   ├── WorkflowDiffView.vue          # Extracted reusable diff UI
│   └── useWorkflowTidyUp.ts          # Shared tidy-up logic
│
└── app/views/
    └── DemoDiffView.vue              # /demo/diff page component
```

### Modified Files

```
packages/frontend/editor-ui/src/
├── features/workflows/workflowDiff/
│   └── WorkflowDiffModal.vue         # Refactored to use WorkflowDiffView
│
├── app/views/
│   └── NodeView.vue                  # Add tidyUp handling to openWorkflow
│
├── app/router.ts                     # Add /demo/diff route
│
└── app/constants.ts                  # Add DEMO_DIFF to VIEWS
```

## Component Specifications

### WorkflowDiffView.vue

**Props:**
- `oldWorkflow: IWorkflowDb` - The "before" workflow
- `newWorkflow: IWorkflowDb` - The "after" workflow
- `oldLabel: string` - Label for left side (default: "Before")
- `newLabel: string` - Label for right side (default: "After")

**Features:**
- Side-by-side canvases with change indicators (added/deleted/modified badges)
- Header with sync views toggle and prev/next navigation buttons
- View-only with pan/zoom and node inspection
- Clicking a node opens side panel with JSON code diff

### DemoDiffView.vue

**Responsibilities:**
- Listen for `postMessage` with `command: 'openDiff'`
- Apply tidy-up if needed using `useWorkflowTidyUp`
- Pass workflows to `WorkflowDiffView` with labels "Before" / "After"
- Emit `n8nReady` message when loaded

### useWorkflowTidyUp.ts

```typescript
export function useWorkflowTidyUp() {
  function shouldTidyUp(
    workflow: IWorkflowDb,
    option?: 'always' | 'if-missing'
  ): boolean {
    if (option === 'always') return true;
    if (option === 'if-missing') {
      return workflow.nodes.every(node => node.position === undefined);
    }
    return false;
  }

  function applyTidyUp(workflow: IWorkflowDb): IWorkflowDb {
    // Uses existing Dagre-based layout logic from useCanvasLayout
    // Returns new workflow object with updated node positions
  }

  return { shouldTidyUp, applyTidyUp };
}
```

## Route Configuration

```typescript
{
  path: '/demo/diff',
  name: VIEWS.DEMO_DIFF,
  component: DemoDiffView,
  meta: {
    layout: 'demo',
    middleware: ['authenticated'],
    middlewareOptions: {
      authenticated: {
        bypass: () => {
          const settingsStore = useSettingsStore();
          return settingsStore.isPreviewMode;
        },
      },
    },
  },
}
```

**Authentication:** Same as `/demo` - bypasses auth when `N8N_PREVIEW_MODE=true`.

## Implementation Tasks

### 1. Create shared utilities
- [ ] `useWorkflowTidyUp.ts` - composable with `shouldTidyUp()` and `applyTidyUp()` functions

### 2. Extract reusable diff view
- [ ] Create `WorkflowDiffView.vue` - extract from `WorkflowDiffModal.vue`
- [ ] Props: `oldWorkflow`, `newWorkflow`, `oldLabel`, `newLabel`
- [ ] Include: canvases, header controls (sync, navigation), aside panel

### 3. Refactor existing modal
- [ ] Update `WorkflowDiffModal.vue` to use `WorkflowDiffView`
- [ ] Keep: modal wrapper, source control fetching, push/pull logic

### 4. Create new `/demo/diff` view
- [ ] Create `DemoDiffView.vue` with postMessage listener for `openDiff`
- [ ] Apply tidy-up logic before passing to `WorkflowDiffView`
- [ ] Add route `/demo/diff` in `router.ts`
- [ ] Add `DEMO_DIFF` to `VIEWS` constant

### 5. Extend `/demo` with tidy-up
- [ ] Update `onPostMessageReceived` in `NodeView.vue` to handle `tidyUp` option
- [ ] Apply tidy-up after `importWorkflowExact` if option is set

### 6. Add i18n translations
- [ ] "Before" / "After" labels
