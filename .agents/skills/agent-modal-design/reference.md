# Agent modal pattern

## Canonical components

Use these components:

- `packages/frontend/editor-ui/src/features/agents/components/modals/AgentModal.vue`
- `packages/frontend/editor-ui/src/features/agents/components/modals/AgentModalMultiStep.vue`
- `packages/frontend/editor-ui/src/features/agents/components/modals/AgentModal.stories.ts`

`AgentModal` owns the dialog shell. It owns the title, Back, Close, body scroll,
and footer layout. `AgentModalMultiStep` adds stable step layout and a subtle
step transition. The feature component owns its data and step history.

## Layout contract

| Area | Rule |
| --- | --- |
| Width | Use `2xlarge` by default. Keep one width for all steps. |
| Header | Use a top divider. Put Back on the left and Close on the right. |
| Title | Use an editable local name when the asset supports one. Do not add an asset icon. |
| Body | Focus the first body field. Keep the title out of the initial focus order. Scroll the body only. Keep its scrollbar visible. |
| Footer | Do not add a divider. Put Remove on the left and Save on the right. |
| Responsive | Support 375 by 667 pixels. Stack footer actions when necessary. |

Use CSS variables for all sizes, spacing, colors, and motion. Use Design System
components. Do not add a new global dialog primitive.

## Title contract

Use the configured local name for schedules, skills, node tools, MCP servers,
workflow tools, and vector stores. Give new items a valid default name. Show the
pencil on hover. Keep the title clickable.

Do not show a second Name field in the body. Show title validation next to the
title after the user selects Save.

Keep the title read-only for external entities. Channels use the integration
label. Sub-agents use the selected Agent name. Custom tools stay read-only
because their reference schema has no local name.

## Action contract

Normal configuration has no Cancel button. Close, Escape, and outside click
discard changes. Back discards the current step and returns to the preserved
picker.

Save stays enabled until a request starts. An invalid Save shows inline errors.
Successful Save, Add, and Remove actions close silently. Use a toast for a
server error. Keep a warning toast when the warning contains information that
the user must act on.

Existing removable items use a subtle bottom-left button with `trash-2`. Use an
explicit label for the asset. Examples include `Remove schedule`, `Remove MCP`,
and `Remove workflow`. New items and picker rows do not show Remove.

## Status contract

Use the same status treatment in Agent picker rows. Show a 14px success check
before `Connected`. Use muted `2xs` text and `3xs` spacing. Show the check
whenever the user-visible status is `Connected`. Keep warning and failure
indicators distinct.

## Multi-step contract

Use the multi-step component for Channels, Sub-agents, Tools, MCP servers,
Workflows, and Vector stores.

Keep the picker mounted. Preserve its search query, selected category, and
scroll position. Put an explicit action in every selectable row. The action
must name the outcome. Use `Add tool`, `Add MCP`, `Add workflow`, or the matching
asset label.

Show Back for an add flow after the user leaves the picker. Do not show Back for
a direct pill edit. Save and Close exit the complete flow.

## Exceptions

| Case | Exception |
| --- | --- |
| Skills | Use `fit` with a 52rem content width. Keep it narrower than `full`. Keep the file navigation and editor inside the scrolling body. |
| Dangerous confirmation | Keep Cancel and the explicit primary action. Examples are Agent, file, and session deletion; unpublish; revert; eval regeneration; LangSmith export; and managed Slack app removal. |
| Managed Slack app removal | Keep the stacked confirmation because it can delete an external resource. |
| Small utility dialog | Keep an appropriate small size. Use Close and one bottom-right primary action. JSON import and Agent duplication use this rule. |
| Channel platform setup | A platform-owned setup action can stay in the inline modal content. The Agent shell still owns navigation and dismissal. |
| Memory | Do not migrate Memory into this pattern in this change. |

## Review checklist

- Confirm the modal uses `AgentModal` or `AgentModalMultiStep`.
- Confirm the title has no asset icon.
- Confirm an editable title replaces a duplicate Name field.
- Confirm Back appears only when a previous step exists.
- Confirm Close is top-right and disabled during a request.
- Confirm normal configuration has no Cancel button.
- Confirm Remove is explicit, has `trash-2`, and appears only for existing items.
- Confirm Save is bottom-right and reveals inline errors.
- Confirm picker state survives Back.
- Confirm success closes silently.
- Confirm UI text uses i18n.
- Confirm the layout works at 375 by 667 pixels in light and dark themes.
