Local QA notes for this branch.

This branch replaces every `ElDropdown` with `N8nDropdownMenu`. Open each menu below. Confirm the items, a selection, Escape, and a click outside.

## Executions list

Go to `/executions`.

- On a finished execution, open the actions menu.
- **Retry with currently saved workflow (from node with error)** and **Retry with original workflow (from node with error)** show for a failed execution you can execute.
- **Delete** asks through the existing delete flow. It stays disabled when you cannot delete executions.
- `packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsListItem.vue`

## Execution preview

Open a workflow execution.

- **Retry execution** opens two retry actions. Choose one. The menu closes.
- **Additional Actions** opens **Highlighted data**. The list stays open while you read it. Escape closes it.
- `packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsPreview.vue`
- `packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionAnnotationPanel.ee.vue`

## Node output

Open a node that has run. Open the JSON output. Select a value.

- The copy button opens **Copy Selection**, **Copy Item Path**, and **Copy Parameter Path**.
- Each action copies and shows a toast.
- With no selection, the same button copies the value directly and does not open a menu.
- `packages/frontend/editor-ui/src/features/ndv/runData/components/RunDataJsonActions.vue`

## Workflow diff

Open a workflow version comparison, or a promotion diff.

- **Changes** opens the nodes, connectors, and settings tabs.
- Choose a changed node. The diff stays open and the canvas selects that node.
- `packages/frontend/editor-ui/src/features/workflows/workflowDiff/WorkflowDiffView.vue`
- `packages/frontend/editor-ui/src/features/workflows/workflowDiff/WorkflowDiffNodeItem.vue`

## Canvas run button

Open a workflow with more than one trigger.

- The chevron next to **Execute workflow** lists the triggers. Choose one.
- The chevron stays the same height as the execute button.
- `packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/buttons/CanvasRunWorkflowButton.vue`
