## Review

- **Blocker — breaking public API removal (confidence 95%)**: `src/components/index.ts:109`
  replaces the exported `N8nRadioButtons`, while `src/components/N8nRadioButtons/` is deleted.
Consumers importing that published symbol will fail immediately. This conflicts with the repository
rule that breaking changes land only on `3.x`. **Fix:** retain a deprecated compatibility
component/export until the next major release.

- **High — radiogroups lack accessible names (confidence 95%)**:
  `src/components/N8nSegmentControl/SegmentControl.vue:114-127` creates a `radiogroup` but supplies
no accessible name by default. Although fallthrough attributes permit callers to add one, the
default story at `SegmentControl.stories.ts:48-49` and all 17 matched editor-ui usages omit both
`aria-label` and `aria-labelledby`. Individual radio labels do not name the group. **Fix:** add an
accessible-label API and update every usage, then test with `getByRole('radiogroup', { name: ...
})`.

- **Medium — Up/Down arrow navigation does nothing (confidence 95%)**: `SegmentControl.vue:38`
  treats all four arrows as supported, but `SegmentControl.vue:123` configures Reka with
`orientation="horizontal"`. Installed Reka UI 2.5.0 filters `ArrowUp`/`ArrowDown` for horizontal
roving-focus groups, so focus remains on the checked item and the fallback at lines 69-80 exits.
Tests at `SegmentControl.test.ts:326-431` cover only Left/Right. **Fix:** explicitly implement
Up/Down previous/next navigation or configure Reka so all standard radio-group arrows work; add
tests for both keys.

- **Medium — form values are submitted with internal type prefixes (confidence 95%)**:
  `SegmentControl.vue:40-48` encodes values as `string:table`/`boolean:true`, and lines 116,
120-121 pass the encoded value and `name` to Reka’s form-backed root. Consequently, a control
documented at `component-segment-control.md:22` as supporting form submission submits the internal
encoded value rather than the option value. **Fix:** decouple internal identity from form
serialization and submit the raw selected option value; add a `FormData` test covering string and
boolean options.