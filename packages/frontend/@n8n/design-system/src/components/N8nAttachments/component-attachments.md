# Component specification

Reusable presentation for files and images. Feature components prepare data, manage state, and handle actions.

- **Component names:** N8nAttachment and N8nAttachmentGroup
- **Figma component:** TBD
- **Implementation:** Custom Vue components
- **Status:** File and image cards with a horizontal scrolling group. Feature adapters retain attachment state and actions.

## Scope and boundaries

- `N8nAttachment` displays one file or image and its available controls.
- `N8nAttachmentGroup` arranges attachments supplied through its default slot.
- Feature components own file selection, validation, conversion, uploads, state updates, and action handling.
- Feature components create and release object URLs. They also resolve server URLs and decide how to handle unavailable files.
- Neither component imports Instance AI or Agents types, stores, or services.
- Resource references use the shared AI `ChatResource` component, not an attachment component. Generic context labels are not automatically resource references.
- This extraction does not change API payloads or stored messages.

## N8nAttachment

### Public API definition

`Attachment.types.ts` defines the public props and events. Apply the documented defaults when implementing the component.

**Props**

| Prop | Type | Purpose |
| --- | --- | --- |
| `fileName` | `string` | Required file name. Supplies the visible label and image alternative text. |
| `mimeType` | `string` | Required MIME type. Selects file or image presentation. |
| `sizeBytes` | `number` | Optional file size in bytes. Omit the size label when absent. Zero is a valid size. |
| `src` | `string` | Optional image preview URL. |
| `isRemovable` | `boolean` | Shows a remove control when true. Default: `true`. |
| `href` | `string` | Optional file URL. Opens in a new tab unless `download` is supplied. |
| `download` | `string` | Optional file name for a native download link. |

**Events**

| Event | Payload | Purpose |
| --- | --- | --- |
| `remove-start` | None | Reports the start of removal. Consumers can block submission. |
| `remove` | None | Requests removal. The parent identifies and removes the item. |
| `remove-end` | None | Reports completion after `remove`, or cleanup when unmount interrupts removal. Consumers can unblock submission. |
| `load` | None | Reports that the image preview loaded. |
| `error` | None | Reports that the image preview failed to load. |

**Slots**

None.

### Target behavior

- Display an image preview when the MIME type identifies an image and `src` is available.
- Display a file representation for other MIME types and for images without a preview URL.
- Keep the file name available when a preview fails. A failed preview must not remove the remove control.
- Show the file size when supplied. Reuse a shared size formatter if one exists.
- Long names must not push controls out of the attachment. Keep the full name available to assistive technology when the visible text is truncated.
- When `href` is supplied, use a native link with `target="_blank"` and `rel="noopener noreferrer"`. Open the URL in a new tab. The browser decides whether to display or download the file.
- Without `href`, display the attachment without a link. Do not infer a link from `src`. The thumbnail URL and file URL can differ.
- The parent supplies a trusted URL. The component does not resolve file URLs or provide a preview dialog.
- Do not fetch files, start downloads in code, or manage object URLs.
- A remove action emits `remove` once. It must not open the file link.
- The parent changes the list after removal. The component does not remove itself.
- Use Design System tokens for spacing, color, borders, and text. Support light and dark modes.

### Accessibility

- Use a native button for removal. Keep it separate from the file link. Do not nest interactive controls.
- Give the file link an accessible name that identifies the file and indicates that it opens in a new tab.
- Keep the file link in the tab order. Support click, Enter, and Space activation. Space must not scroll the page or open more tabs when held.
- Give the remove button a translated accessible name that identifies the file.
- Use `fileName` as image alternative text. Avoid duplicate announcements when the file name is also visible.
- Preserve visible keyboard focus on controls.
- Do not use color alone to communicate a failed or unavailable preview.

### Open decisions

The initial props do not define loading, upload progress, error messages, or unavailable-file states. Confirm the required display states with consumers before adding a status API. Do not infer upload status from image `load` or `error` events.

## N8nAttachmentGroup

### Public API definition

**Props:** None initially.

**Events:** None initially.

**Slots**

- `default`: Attachment items. The parent owns iteration, stable keys, and event handlers.

### Layout and interaction

The implementation uses a horizontal scrolling row, not a wrapping grid:

- Direct child elements do not shrink.
- Items remain in a single row without overlap.
- The group uses horizontal scrolling for overflow.
- Left and right arrow keys move focus between items. Their direction follows the text direction.
- Motion respects the reduced-motion preference.

The exposed `focus()` method focuses the first item. Escape returns focus to the previous control. Focus after animated removal needs integration review.

The group does not select, sort, remove, or collapse items. Wrapping, collapse limits, and overflow counters are future options, not part of the initial API. An empty slot must not create an empty-state message.

## Integration

Paths below are relative to `packages/frontend/editor-ui/src/features/`.

| Consumer | Responsibility after extraction |
| --- | --- |
| `ai/instanceAi/components/AttachmentPreview.vue` | Adapt file and image data to `N8nAttachment`. Route resource references through `ChatResource`. |
| `ai/instanceAi/components/InstanceAiInput.vue` | Use the group for draft files. Retain selection, validation, and removal logic. |
| `ai/instanceAi/components/InstanceAiMessage.vue` | Display sent files and resource references through their respective presentation components. |
| `ai/instanceAi/components/InstanceAiResourceChip.vue` | Replace with, or migrate into, shared `ChatResource`. |
| `ai/instanceAi/components/NodeChip.vue` and `NodesAttachmentChips.vue` | Use `ChatResource` for presentation. Retain node lookup, grouping, expansion, and selection updates. |
| `agents/components/AgentChatPanel.vue` | Use attachment components for draft files and `ChatResource` for references. Remove presentation imports from Instance AI. |
| `agents/components/AgentChatMessageAttachments.vue` | Use both attachment components. Retain URL resolution and unavailable-file handling. |

Agent Build mode embeds the Instance AI conversation and receives its presentation changes through that integration. Keep the existing Instance AI and Agents logic split.

## Acceptance coverage

Add focused component tests and stories for these cases as implementation proceeds. This list defines required coverage; it does not report existing test results.

| Area | Required cases |
| --- | --- |
| File display | File name, size omitted, zero size, long name, unknown MIME type |
| Image display | Valid preview, missing preview, failed preview |
| Removal | Visible by default; hidden when disabled; one event; no file link activation |
| File link | Opens `href` in a new tab with `noopener noreferrer`; no link when absent; does not use `src` as a fallback |
| Image events | Successful load and failed load emit the corresponding event |
| Accessibility | File-specific remove label, new-tab link name, image alternative text, visible focus, no nested controls |
| Group | Empty, one item, multiple items, list fragments, item insertion and removal |
| Layout | Narrow container, horizontal overflow, right-to-left layout, pointer and keyboard access |
| Appearance | Light mode, dark mode, reduced motion |
| Integration | Draft removal, unavailable files, and resource references remain feature-owned |
