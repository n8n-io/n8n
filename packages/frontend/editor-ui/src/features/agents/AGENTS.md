# Agent modal design

Use `components/modals/AgentModal.vue` for every Agent configuration modal.
Use `components/modals/AgentModalMultiStep.vue` when the user selects an item
before they configure it.

Do not migrate `AgentMemoryPanel.vue` into this pattern. Memory needs separate
design work.

## Shell

- Use `N8nDialog` through `AgentModal`. Do not use the legacy `Modal` component.
- Use `2xlarge` as the default size. Keep the size stable between steps.
- Use `fit` for Skills. Make it wider than `2xlarge` but narrower than `full`.
- Use `full` only when the user explicitly asks for the extra workspace.
- Keep the header divider. Do not add a footer divider.
- Keep the header and footer fixed. Let the body scroll.
- Keep scrollbars visible when the body or nested modal content can scroll.
- Put Close in the top-right corner. Disable it while an action is in progress.
- Put Back in the header. Show it only when the flow has a previous step.
- Do not put an asset icon in the modal title.
- Test the layout at 375 by 667 pixels and in light and dark themes.

## Titles and fields

- Use the local asset name as the title when the user can edit the name.
- Show the edit affordance on hover. Let the user click the title to edit it.
- Give each new local asset a valid default name.
- Do not duplicate the name in the body.
- Focus the first body field when the modal opens. Do not focus the title.
- Keep external entity names read-only. This applies to channels and sub-agents.

## Actions

- Put Save in the bottom-right corner.
- Keep Save enabled unless a request is in progress. Show inline errors after an invalid Save.
- Do not add Cancel to normal configuration modals. Close, Escape, and outside click discard changes.
- Put Remove in the bottom-left corner for an existing removable item.
- Use a trash icon and an explicit label, such as `Remove workflow`.
- Do not show Remove in a picker row or for a new item.
- Apply association removals immediately. Close the modal without a success toast.
- Keep Cancel only for a dangerous confirmation.

## Status

- Show a success check before `Connected` in picker rows.
- Use the same muted `2xs` status text for Channels, Tools, and MCP servers.
- Show the check whenever the user-visible status is `Connected`. Keep failure indicators distinct.

## Multi-step flows

- Keep the picker mounted while the configuration step is open.
- Preserve the picker search, category, and scroll state on Back.
- Back discards changes in the current configuration step.
- Close exits the whole flow. Save exits the whole flow.
- A direct pill edit opens the configuration step without Back.
- Use an explicit action in each picker row. Use `Add tool`, `Add MCP`, `Add workflow`, or the matching asset label.

See `.agents/skills/agent-modal-design/reference.md` for the full pattern and exceptions.
