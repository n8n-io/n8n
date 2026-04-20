# GHC-7768 Root Cause Analysis

## Issue
Users cannot click on floating node previews in the Node Details View (NDV) to navigate between nodes.

## Root Cause

### DOM Structure
```html
<dialog style="z-index: [APP_Z_INDEXES.NDV]">
  <NDVFloatingNodes />  <!-- position: absolute, z-index: 10 -->
  <div class="container">  <!-- no z-index, comes after in DOM -->
    <NDVHeader />  <!-- z-index: 1 -->
    <main class="main">  <!-- position: relative -->
      <!-- Input/Output panels and settings -->
    </main>
  </div>
</dialog>
```

### The Problem

1. **NDVFloatingNodes** (`packages/frontend/editor-ui/src/features/ndv/panel/components/NDVFloatingNodes.vue`):
   - Has `position: absolute` with `z-index: 10`
   - Covers entire dialog area (top: 0, bottom: 0, left: 0, right: 0)
   - Container has `pointer-events: none`
   - Individual nodes have `pointer-events: all`

2. **Container div** (`.container` in NodeDetailsViewV2):
   - No explicit z-index (defaults to `auto`/`0`)
   - Rendered AFTER NDVFloatingNodes in DOM
   - Has background color and border, creating visual blocking

3. **Stacking Context Issue**:
   - Both elements are children of the same `dialog` element
   - The `.container` creates a new stacking context due to having a background
   - Even though `.container` has no explicit z-index, it may be painted on top of floating nodes
   - The `.main` element inside has `position: relative`, which can affect stacking

4. **Z-index Hierarchy**:
   - NDVFloatingNodes: `z-index: 10`
   - Container: `z-index: auto` (effectively 0)
   - NDVHeader (inside container): `z-index: 1`
   - Main panel: `position: relative` (creates stacking context)

### Why Tests Pass

The existing test in `ndv-floating-nodes.spec.ts` uses `{ force: true }`:

```typescript
await this.getFloatingNodeByPosition(position).click({ force: true });
```

This bypasses Playwright's actionability checks, including:
- Element visibility
- Element not being obscured
- Element having pointer-events enabled

So the test passes even though real users cannot click the elements naturally.

## Evidence

1. **CSS Analysis**: NDVFloatingNodes.vue:147-266
   - Container: `pointer-events: none` (line 155)
   - Nodes: `pointer-events: all` (line 206)
   - Container z-index: 10 (line 154)

2. **Test Code**: NodeDetailsViewPage.ts:727-731
   - Uses `{ force: true }` which masks the bug

3. **DOM Order**: NodeDetailsViewV2.vue:723-730
   - NDVFloatingNodes comes before .container
   - Without proper z-index management, later elements can block clicks

## Likely Fix Approaches

1. **Increase z-index of floating nodes**: Set to a higher value than any content in `.container`
2. **Set explicit z-index on container**: Give `.container` a z-index lower than floating nodes
3. **Reorder DOM elements**: Move NDVFloatingNodes after .container in DOM
4. **Check stacking contexts**: Ensure `.main` element doesn't create a blocking stacking context

## User Impact

- Version reported: 2.13.3
- Platform: Docker (cloud)
- Users can see the floating node previews but cannot click them
- Keyboard navigation (Shift+Meta+Alt+Arrow) still works as fallback
- Significantly impacts UX for navigating between connected nodes
