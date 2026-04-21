# Dev Panel — annotate the n8n editor and copy to Claude

An in-app overlay that lets developers select DOM elements in the n8n editor,
attach a prompt to each, and copy the whole batch as formatted markdown to
paste into Claude Code (or any other tool).

Think "Vue Agentation, but everything lives in the clipboard."

## Status

MVP shipped. Clipboard-only, dev-only.

## Goals

- Dev-only tool; zero bytes and zero side effects in production builds.
- Pick DOM elements, annotate them with prompts, copy the batch as markdown.
- Annotations persist across refreshes (7-day TTL) and survive HMR.
- No backend, no MCP server, no extra process to run.

## Non-goals

- Auto-sending prompts into a running Claude session (removed — clipboard is
  enough for the first version).
- Two-way chat with Claude from inside the panel.
- Shipping as a public plugin / npm package.

## UX flow

1. Run `pnpm dev` in `packages/frontend/editor-ui`. The panel mounts but stays
   hidden behind a floating action button.
2. Click the FAB to open the toolbar.
3. Click "pick element", hover/click or drag to select one or more elements.
4. A popover appears; type a prompt and press **Add** (⌘↵) to store it.
5. Continue adding more annotations. Numbered markers overlay each target.
6. Click the copy button to copy all annotations as markdown, then paste them
   into Claude Code.

## Files

```
packages/frontend/editor-ui/src/app/dev/dev-panel/
  index.ts                  entry, mounted dev-only
  DevPanel.vue              overlay root, toolbar, markers, toast
  PromptPopover.vue         anchored textarea + Add/Cancel
  useElementPicker.ts       hover highlight, click + drag-to-select
  collectElementContext.ts  extracts file/line/component/selector/bbox
  annotationStorage.ts      localStorage persistence (7-day TTL)
  formatPrompt.ts           renders annotations as markdown for clipboard
```

Dev-only enforcement: `DevPanel` is imported behind
`import.meta.env.DEV` so Vite tree-shakes it out of production builds.

## Source-location mapping

Uses [`vite-plugin-vue-inspector`](https://github.com/webfansplz/vite-plugin-vue-inspector)
in dev mode. It injects `data-v-inspector="<path>:<line>:<col>"` on every
rendered element; the picker walks up from the click target to the nearest
element with that attribute.

Fallbacks baked into the copied markdown so Claude can grep:

- `testid` — nearest `data-testid` ancestor
- `component` — nearest Vue component name
- `selector` — simplified CSS path
- `domPath` — human-readable DOM path
- `outerHtmlSnippet` — first 500 chars of `outerHTML`

## Clipboard format

```markdown
## Page Feedback: /workflow/new
**Viewport:** 1440×900

### 1. <NodeView> button "Run"
**Location:** div.canvas > button.primary
**Source:** packages/frontend/editor-ui/src/app/components/NodeView.vue:142
**Vue:** <NodeView>
**Test ID:** execute-workflow-button
**Feedback:** make this button larger and add a tooltip
```
