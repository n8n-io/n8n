# Bug Analysis: N8N-9980 - Sticky Note Change Color Menu Non-Functional

## Summary
The "change color" context menu item for sticky notes does not trigger the color picker popover.

## Expected Behavior
1. User right-clicks sticky note → context menu opens
2. User clicks "change color" menu item
3. Color picker popover appears with color options

## Actual Behavior
The "change color" menu item is clicked but nothing happens - no color picker appears.

## Code Flow Analysis

### Event Chain (Expected)
1. **Canvas.vue:846** - Context menu 'change_color' action handler:
   ```typescript
   case 'change_color':
     return props.eventBus.emit('nodes:action', { ids: nodeIds, action: 'update:sticky:color' });
   ```

2. **CanvasNode.vue:357** - Listens for 'nodes:action' events:
   ```typescript
   props.eventBus?.on('nodes:action', emitCanvasNodeEvent);
   ```

3. **CanvasNode.vue:133-136** - Re-emits on node's local event bus:
   ```typescript
   function emitCanvasNodeEvent(event: CanvasEventBusEvents['nodes:action']) {
     if (event.ids.includes(props.id) && canvasNodeEventBus.value) {
       canvasNodeEventBus.value.emit(event.action, event.payload);
     }
   }
   ```

4. **CanvasNodeStickyColorSelector.vue:67** - Listens for the event:
   ```typescript
   eventBus.value?.on('update:sticky:color', showPopover);
   ```

5. **CanvasNodeStickyColorSelector.vue:31-33** - Shows popover:
   ```typescript
   function showPopover() {
     isPopoverVisible.value = true;
   }
   ```

## Key Files
- `packages/frontend/editor-ui/src/features/workflows/canvas/components/Canvas.vue:846`
- `packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/nodes/CanvasNode.vue:133-136, 357`
- `packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/nodes/toolbar/CanvasNodeStickyColorSelector.vue:67, 31-33`
- `packages/frontend/editor-ui/src/features/shared/contextMenu/composables/useContextMenuItems.ts:288-291`

## Possible Root Causes
1. **Event bus routing failure** - The 'nodes:action' event may not be reaching the CanvasNode for sticky notes
2. **Event listener not registered** - The color selector's event listener may not be properly mounted for sticky notes
3. **Popover visibility logic** - The popover may not be rendering even when `isPopoverVisible` is set to true
4. **V-model binding issue** - The v-model:visible binding between CanvasNodeStickyColorSelector and CanvasNodeToolbar may be broken

## Test File
Created failing E2E test at:
`packages/testing/playwright/tests/e2e/workflows/editor/canvas/sticky-note-context-menu.spec.ts`

The test:
1. Creates a sticky note
2. Right-clicks to open context menu
3. Clicks the "change color" menu item
4. Expects the color picker popover to be visible (THIS WILL FAIL, reproducing the bug)

## Fix Approach
Once the failing test is run and the actual failure mode is observed, the fix will likely involve:
1. Ensuring the event bus is properly wired for sticky note nodes
2. Verifying the event listener is registered when the color selector component is mounted
3. Checking the popover component's visibility toggle mechanism
4. Testing the v-model binding between parent and child components
