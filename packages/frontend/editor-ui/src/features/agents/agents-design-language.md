# Agent design language

This document is the source of truth for Agent-only interface patterns in this
module. It starts with modal patterns. Add other reusable Agent patterns as the
interface develops.

## Scope

- Keep Agent-specific components and behavior in this module.
- Use Design System components and CSS variables.
- Do not add or change a global Design System primitive for an Agent-only need.
- Put all user-facing text in i18n.
- Test responsive layouts at 375 by 667 pixels and in light and dark themes.

## Modal patterns

### Canonical components

Use these components:

- `components/modals/AgentModal.vue`
- `components/modals/AgentModalMultiStep.vue`

`AgentModal` owns the dialog shell. It owns the title, Back, Close, Cancel, body
scroll, and footer layout. `AgentModalMultiStep` adds stable picker layout and a
subtle step transition. The feature component owns its data and step history.

Do not migrate `AgentMemoryPanel.vue` into this pattern. Memory needs separate
design work.

### Layout contract

| Area       | Rule                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Width      | Use `2xlarge` by default. Keep one width for all steps.                                                                      |
| Header     | Keep the header's bottom divider. Put Back on the left and Close on the right.                                               |
| Title      | Use an editable local name when the asset supports one. Do not add an asset icon.                                            |
| Body       | Focus the first body field. Keep the title out of the initial focus order. Scroll the body only. Keep its scrollbar visible. |
| Footer     | Do not add a divider. Put ghost Remove on the left. Put Cancel before the primary action on the right.                       |
| Responsive | Support 375 by 667 pixels. Stack footer actions when necessary.                                                              |

Use CSS variables for all sizes, spacing, colors, and motion. Do not add a new
global dialog primitive.

Use `fit` for Skills. Use a 52rem content width. Keep it narrower than `full`.
Use `full` only when the user explicitly asks for the extra workspace.

Keep the header and footer fixed. Let the body scroll. Keep scrollbars visible
when the body or nested content can scroll. The Agent shell is the only scroll
owner for normal configuration forms. Do not put fixed heights or nested
scrollbars on MCP, node, or workflow configuration content. A picker can use a
stable minimum height. A configuration step must use its natural height.

### Title contract

Use the configured local name for schedules, skills, node tools, MCP servers,
workflow tools, and vector stores. Give new items a valid default name. Show the
pencil on hover. Keep the title clickable.

Do not show a second Name field in the body. Show title validation next to the
title after the user selects Save.

Keep the title read-only for external entities. Channels use the integration
label. Sub-agents use the selected Agent name. Custom tools stay read-only
because their reference schema has no local name.

### Action contract

Normal configuration has a Cancel button before the primary action. Cancel,
Close, Escape, and outside click discard changes. Back discards the current
step and returns to the preserved picker.

Put a non-destructive secondary action before Cancel. For schedules, use the
order `Preview`, `Cancel`, `Save`, and use the ghost variant for Preview.

Save stays enabled until a request starts. An invalid Save shows inline errors.
Successful Save, Add, and Remove actions close silently. Use a toast for a
server error. Keep a warning toast when the warning contains information that
the user must act on.

Existing removable items use a ghost bottom-left button with `trash-2`. Use an
explicit label for the asset. Examples include `Remove schedule`, `Remove MCP`,
and `Remove workflow`. New items and picker rows do not show Remove.

### Status contract

Use the same status treatment in Agent picker rows. Show a success check before
`Connected` or `Added`. Use `Added` for selected Sub-agents. Use muted `2xs`
text and `3xs` spacing. Keep warning and failure indicators distinct.

### Multi-step contract

Use the multi-step component for Channels, Sub-agents, Tools, MCP servers,
Workflows, and Vector stores.

Keep the picker mounted. Preserve its search query, selected category, and
scroll position. Always show the search input. Put a create row first when the
user can create the asset. Workflows use `Create workflow`. Sub-agents use
`Create agent`. Give the create row a short subtitle that describes the action.

Put an explicit action in every selectable row. The action must name the
outcome. Use `Add node`, `Add MCP`, `Add workflow`, or the matching asset label.
When the list has no items or no search matches, show a centered, asset-specific
message. Do not use a drop zone or a decorative empty-state icon for a picker.
Use less space above the embedded search input and more space between the input
and the tabs.

Show Back for an add flow after the user leaves the picker. Do not show Back for
a direct pill edit. Save, Cancel, and Close exit the complete flow.

### Exceptions

| Case                      | Exception                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Skills                    | Use `fit` with a 52rem content width. Keep it narrower than `full`. Keep the file navigation and editor inside the scrolling body.                                                   |
| Dangerous confirmation    | Keep its explicit Cancel and primary actions. Examples are Agent, file, and session deletion; unpublish; revert; eval regeneration; LangSmith export; and managed Slack app removal. |
| Managed Slack app removal | Keep the stacked confirmation because it can delete an external resource.                                                                                                            |
| Small utility dialog      | Keep an appropriate small size. Use Cancel and one bottom-right primary action. JSON import and Agent duplication use this rule.                                                     |
| Channel platform setup    | A platform-owned setup action can stay in the inline modal content. The Agent shell still owns navigation and dismissal.                                                             |
| Memory                    | Do not migrate Memory into this pattern in this change.                                                                                                                              |

### Review checklist

- Confirm the modal uses `AgentModal` or `AgentModalMultiStep`.
- Confirm the title has no asset icon.
- Confirm an editable title replaces a duplicate Name field.
- Confirm Back appears only when a previous step exists.
- Confirm Close is top-right and disabled during a request.
- Confirm Cancel appears before the primary action.
- Confirm Remove is explicit, uses ghost styling, has `trash-2`, and appears only for existing items.
- Confirm Save is bottom-right and reveals inline errors.
- Confirm picker state survives Back.
- Confirm search stays visible and empty copy names the asset.
- Confirm a permitted create action appears before the list.
- Confirm success closes silently.
- Confirm UI text uses i18n.
- Confirm the layout works at 375 by 667 pixels in light and dark themes.

## Extend this document

Add a section when an Agent-specific pattern applies to two or more Agent
surfaces. Keep implementation details with the owning pattern. Do not duplicate
global Design System guidance.
