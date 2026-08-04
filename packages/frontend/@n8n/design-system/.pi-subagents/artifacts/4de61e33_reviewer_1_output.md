## Review

- Correct: All `N8nRadioButtons` usages were migrated within `editor-ui/src`; the Playwright
  active-mode locator now targets the checked radio specifically.
- **Medium:**
  `packages/frontend/editor-ui/src/features/ndv/runData/components/ai/AiRunContentBlock.vue:97-112`
— The segment control is inside a header whose click handler collapses the block. Unlike the former
radio buttons, segment-control clicks bubble, so choosing “Rendered” or “JSON” also collapses the
content. Add `@click.stop` to the control and test that changing render mode leaves the block
expanded.
- **Low:**
 
`packages/frontend/editor-ui/src/features/workflows/workflowDiff/WorkflowDiffView.vue:177-187,313-32
5` — The template still passes `$style.tabs`, but the `.tabs` rule that made all tabs equally fill
the dropdown was deleted without a segment-control replacement. The control now shrinks to content
width and the class resolves undefined. Restore `.tabs` with full width and apply `flex: 1` to
`.n8n-segment-control-item`.
- Note: Editor tests could not start because `@n8n/frontend-constants/versions` was unresolved.
  Editor typecheck exhausted its 8 GB heap. No Playwright suite was run.