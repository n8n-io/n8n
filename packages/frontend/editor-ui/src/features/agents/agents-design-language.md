# Agent design language

This document defines reusable Agent interface patterns in this module. Add
patterns as the interface develops.

## Scope

- Keep Agent-specific components and behavior in this module.
- Use Design System components and CSS variables.
- Do not add or change a global Design System primitive for an Agent-only need.
- Put all user-facing text in i18n.
- Test responsive layouts at 375 by 667 pixels and in light and dark themes.

## Breadcrumbs

Show the project icon before the project name in Agent builder and session
timeline breadcrumbs. Use the same icon as the owning project. Show the user
icon for a personal project.

## Narrow builder panels

Keep a chip and its adjacent add action inside the available row width. Truncate
the chip text before the action moves outside the panel.

Show session details on separate lines when the session list is narrow. Keep the
title, origin, date, token count, and actions visible without overlap.

Stack a setting label above its control when the row is narrow. Give the label
the full row width. Give a wide control, such as a model picker, the full row
width. Keep a short control at its natural width. Keep the control inside the
row. The model menu uses the control width, so the menu stays inside the editor
column.

Reduce the editor column side padding when the column is narrow.

## Preview history

Use the shared `ChatHistoryDropdownTrigger` in the Preview dock and the Assistant.
The shared button shows the history icon and the chat title. Click the title or
the icon to open history. Show only “Chat history” when no chat title exists. Do
not show “New session” before the Preview session starts. Truncate long titles
inside the shared button. Keep the header actions visible.
Use the `x` icon for the Preview close action, as the Assistant does.

## Fix with Assistant

In the standalone Agents UI, open or reuse the Assistant in the left panel.
Keep the current Agent configuration available. Pass the relevant credential,
error, or session context and the fix prompt to that panel. Close configuration
dialogs only after the panel accepts the request. Preserve a refused request.
Show these actions only after Assistant setup is complete.

Keep the test error and its fix action inside the callout. Move the action below
the error when the row does not fit the panel. Wrap long URLs and error text.

Agent artifacts inside an Assistant chat keep the handoff in that chat.

## Item context menus

Use `AgentItemContextMenu` for removable configuration chips. It wraps the
Design System context menu and shows one destructive `Remove` action.
Keep normal-click editing and existing modal removal controls.

In the standalone Agent Builder, put `Activate` or `Deactivate` before `Remove`
for tools, workflow references, skills, sub-agents, and schedules. Use `play` for
`Activate`, `timer` for `Deactivate`, and `trash-2` for `Remove`.
Put `Remove` in a separate group below a divider.
Keep these actions out of inline Agent editors and channel,
MCP, vector store, and memory menus. Schedules use this menu instead of a modal
switch. Activation edits the draft and takes effect in production after publish.

Keep deactivated items editable and removable. Use the same reduced opacity as
a disabled Design System button. Apply it to the whole chip in both themes.
Do not show a status tag on the chip. Keep `Deactivated` in its accessible
description. Each grouped tool has its own activation action. The group menu
has no activation action. Mark the group deactivated only when all its tools
are off.

For grouped tools, put the menu on the group chip and each item in its dropdown.
Remove on the group removes all its tool references in one configuration update.
Normal click still opens the dropdown. Remove on an item removes only that
reference. Keep shared workflows and sub-agents. Schedules and channels use
their existing removal flows. Keep the managed Slack confirmation and its
external app choice.

Disable the menu under edit locks and read-only access. Check this state again
when the user selects an action. Configuration errors must not block removal
or deactivation.

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

| Area       | Rule                                                                                                                                                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Width      | Use `2xlarge` by default. Keep one width for all steps.                                                                                                                                                                                                                             |
| Header     | Keep the header's bottom divider. Put Back on the left and Close on the right.                                                                                                                                                                                                      |
| Title      | Use an editable local name when the asset supports one. Do not add an asset icon.                                                                                                                                                                                                   |
| Body       | Let `AgentModal` own the outer body inset. Do not repeat it on the first content wrapper. Focus the first body field. If there is no body control, use the dialog's default focus. Keep the title out of the initial focus order. Scroll the body only. Keep its scrollbar visible. |
| Footer     | Do not add a divider. Put ghost Remove on the left. Put Cancel before the primary action on the right.                                                                                                                                                                              |
| Responsive | Support 375 by 667 pixels. Stack footer actions when necessary.                                                                                                                                                                                                                     |

Use CSS variables for all sizes, spacing, colors, and motion. Do not add a new
global dialog primitive.

Use `fit` for Skills. Use a 52rem content width. Keep it narrower than `full`.
Use `full` only when the user explicitly asks for the extra workspace.

Keep the header and footer fixed. Let the body scroll. Keep scrollbars visible
when the body or nested content can scroll. The Agent shell is the only scroll
owner for normal configuration forms. Do not put fixed heights or nested
scrollbars on MCP, node, or workflow configuration content. A picker can use a
stable minimum height. A configuration step must use its natural height.

Do not add top padding or a top margin to a modal's first content wrapper. The
shell supplies that space. Use the flush body only for a full-bleed workspace.
The workspace must then own all of its edge spacing.

When a nested credential or parameter editor dialog is open, release the parent
focus trap and block parent dismissal. The nested dialog owns Escape until it
closes. Render expanded parameter editors in the body portal above the Agent
modal.

### Title contract

Use the configured local name for schedules, skills, node tools, MCP servers,
workflow tools, and vector stores. Give new items a valid default name. Show the
pencil on hover. Keep the title clickable.

Do not show a second Name field in the body. Show title validation next to the
title after the user selects Save.

Skills show `Add skill` on the upload screen. Show the editable skill name in
the title when the editor opens. Give a new manual skill a unique `New skill`
name. Show an imported skill's name after upload. Keep Name out of the
`SKILL.md` editor and show name errors beside the title after Save.

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
Keep the outer modal body fixed on picker steps. Show a list scrollbar only
when the list content overflows. Do not show a scrollbar for an empty state.

Put an explicit action in every selectable row. The action must name the
outcome. Use `Add node`, `Add MCP`, `Add workflow`, or the matching asset label.
When the list has no items or no search matches, show a centered, asset-specific
message. Do not use a drop zone or a decorative empty-state icon for a picker.
Use less space above the embedded search input and more space between the input
and the tabs.

Show Back for an add flow after the user leaves the picker. Do not show Back for
a direct pill edit. Save, Cancel, and Close exit the complete flow.

### Exceptions

| Case                      | Exception                                                                                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skills                    | Use `fit` with a 52rem content width. Keep it narrower than `full`. Use the flush Agent body so the file workspace does not get double padding. Keep the file navigation and editor inside the scrolling body. |
| Dangerous confirmation    | Keep its explicit Cancel and primary actions. Examples are Agent, file, and session deletion; unpublish; revert; eval regeneration; LangSmith export; and managed Slack app removal.                           |
| Managed Slack app removal | Keep the stacked confirmation because it can delete an external resource.                                                                                                                                      |
| Small utility dialog      | Keep an appropriate small size. Use Cancel and one bottom-right primary action. JSON import and Agent duplication use this rule.                                                                               |
| Channel platform setup    | A platform-owned setup action can stay in the inline modal content. The Agent shell still owns navigation and dismissal.                                                                                       |
| Memory                    | Do not migrate Memory into this pattern in this change.                                                                                                                                                        |

New skills start with an upload screen. Make `Upload folder` the primary
action. Support a single `SKILL.md` file and folder drops. Put `Add manually`
below the drop zone, inline with the prompt. Keep the same font and underline.
Change only its text color on hover. Do not show a background. Hide the footer
until the editor opens. Show Back for manual creation. Back discards the draft
and returns to the upload screen.
Existing skills open in the editor. Keep the body field order: When to use this
skill, What the skill does, and Allowed tools. Use `Save skill` to confirm.

### Review checklist

- Confirm the modal uses `AgentModal` or `AgentModalMultiStep`.
- Confirm the title has no asset icon.
- Confirm an editable title replaces a duplicate Name field, including Skills.
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

## Recoverable plan errors

Show rejected plan input and revision conflicts in the normal tool-call row.
Keep the warning icon and use a short tooltip. Do not show a separate error
callout or a Fix with Assistant action for these errors. Keep the full input
and output in the collapsed details and the trace. Keep earlier failed calls
visible after a successful retry. Unexpected failures keep the existing error
treatment.

## Extend this document

Add a section when an Agent-specific pattern applies to two or more Agent
surfaces. Keep implementation details with the owning pattern. Do not duplicate
global Design System guidance.

## Model-defined inputs

Use `ParameterInputFull` for workflow inputs and node tool parameters.
It owns the field label, Fixed/Expression controls, AI button, model chip,
and hover and focus behavior. Use its controlled input mode for workflow
bindings. Keep binding conversion and optional input guidance in the caller.
Hide the Edit value action in read-only forms. Keep input issues visible
beside the model label.

## Tool approvals

Use `N8nApprovalCard` for Preview tool approvals, including background child
approvals. It owns the shared layout, keyboard controls, and standard choices
for the Assistant and Agent Preview. Pass the app catalog labels through
`useApprovalCardLabels`.
Pass the sanitized display arguments from the backend to the shared card.
For node tools, include the resolved node parameters and any model input.
The card formats and shows these values inline for both surfaces. Leave space
for the card's outline and shadow inside scrollable containers.
Keep approval policy and response payloads in the caller. Show the session
option only when the backend supports it. Replace the Preview composer with
pending tool approvals, including background child approvals. Restore the
composer and its draft after the approvals are resolved. Show one approval
at a time, as the Assistant does. Advance to the next pending approval after
each response. Use the existing child task order for background approvals.
Focus each approval as it appears. Return focus to the composer after the last
decision. Keep tool steps, questions, and display cards in the conversation.
If a surface keeps a resolved card, show the decision without active actions.

## Preview composer queue

Use one action on the right. Show Stop when a turn can be stopped and the
composer has no text or attachments. Otherwise, show Send. Keep file and voice
input available during a turn.
Stack the background task card above the composer. Attach pending messages to
the top of the composer. Use `--background--subtle` for the queue background.
Use `--color--neutral-600` for queue text and the Steer label in light mode.
Use `--text-color--subtler` in dark mode. Use `--color--neutral-400` for all queue
icons. Use `--border-color--subtle` for the dividers.
Use `xs` text and `medium` icons. Keep the action targets at least 24 by 24 pixels.
Show a single queued message without a toggle or drag handle.
Collapse the full list when the queue has two or more messages. Show the total
message count in the header. Keep messages in queue order when expanded.
Keep pending messages out of the conversation until processing starts. Give each
message a Remove action. Hide an empty queue section. Removal discards the
message. It does not restore the composer draft.

Edit removes the pending message from the queue and restores its text and attachments in the composer. Restore the draft only after removal succeeds. Disable Edit while the composer has a draft. Alt/Option+ArrowUp in the composer edits the last queued message. Ignore the shortcut if that message is busy or the composer has a draft. Send uses the normal message path and adds the message to the end of the queue if a turn is still running. Do not pause the queue.

Show drag handles only when the queue has two or more messages. Put a six-dot drag handle on the left of each pending message in that queue. Drag the handle to move the message. Support the Up and Down arrow keys on the handle. Expand the queue when a drag starts or a message moves. Keep keyboard focus on the moved message. Show the new order during saving. Disable queue actions while the order saves. Messages reserved for steering cannot move. If the move no longer applies, refresh the queue and show an error.

Put the action to send a message to the current execution immediately before Edit. Use the existing corner-down-right icon with the Steer label on its right. Use the existing button and tooltip. Enable it only when the server reports an eligible execution. Keep an accepted steering request in the panel with a waiting status. Disable its actions until the runtime consumes it or returns it to ordinary queue processing. When the runtime consumes the message, show it between the surrounding assistant output. Keep Stop bound to the same execution.

## Preview retries

Show Resend message inside the latest error callout only for errors that explicitly
support retry. Use the subtle button style, as Fix with Assistant does. Support the
saved empty-answer error and the stream-stall error. Do not offer resend for other
failures. Send the original message and its attachments through the normal send
action. Keep the failed turn visible. Move the button below the text when needed.
Disable resend while a draft, queued message, active turn, or blocked send exists.
Keep the message unchanged if an attachment cannot load.
