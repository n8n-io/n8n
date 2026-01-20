# Component specification

- **Component Name:** N8nDialog

## Overview

N8nDialog is a composed component system built on top of [reka-ui Dialog](https://reka-ui.com/docs/components/dialog). It provides a set of primitive components that can be composed together to create accessible modal dialogs with n8n styling.

## Components

| Component              | Base Component      | Description                                   |
| ---------------------- | ------------------- | --------------------------------------------- |
| `N8nDialogRoot`        | `DialogRoot`        | Contains all dialog parts, manages open state |
| `N8nDialogTrigger`     | `DialogTrigger`     | Button that opens the dialog                  |
| `N8nDialogOverlay`     | `DialogOverlay`     | Backdrop that covers the page                 |
| `N8nDialogContent`     | `DialogContent`     | Container for dialog content                  |
| `N8nDialogHeader`      | -                   | Styled container for title and description    |
| `N8nDialogTitle`       | `DialogTitle`       | Accessible dialog title                       |
| `N8nDialogDescription` | `DialogDescription` | Optional accessible description               |
| `N8nDialogFooter`      | -                   | Styled container for action buttons           |
| `N8nDialogClose`       | `DialogClose`       | Button that closes the dialog                 |

---

## Public API Definition

### N8nDialogRoot

**Props**

| Prop          | Type      | Default | Description                                            |
| ------------- | --------- | ------- | ------------------------------------------------------ |
| `open`        | `boolean` | -       | Controlled open state                                  |
| `defaultOpen` | `boolean` | `false` | Initial open state (uncontrolled)                      |
| `modal`       | `boolean` | `true`  | Whether to render as modal (blocks interaction behind) |

**Events**

| Event         | Payload   | Description                     |
| ------------- | --------- | ------------------------------- |
| `update:open` | `boolean` | Emitted when open state changes |

**Slots**

| Slot      | Slot Props        | Description  |
| --------- | ----------------- | ------------ |
| `default` | `{ open, close }` | Dialog parts |

---

### N8nDialogTrigger

**Props**

| Prop      | Type      | Default | Description                                       |
| --------- | --------- | ------- | ------------------------------------------------- |
| `asChild` | `boolean` | `false` | Merges props onto child element instead of button |

**Slots**

| Slot      | Description     |
| --------- | --------------- |
| `default` | Trigger content |

---

### N8nDialogPortal

**Props**

| Prop       | Type                    | Default | Description                         |
| ---------- | ----------------------- | ------- | ----------------------------------- |
| `to`       | `string \| HTMLElement` | `body`  | Target container for portal         |
| `disabled` | `boolean`               | `false` | Disable portaling (render in place) |

---

### N8nDialogOverlay

**Props**

| Prop         | Type      | Default | Description                       |
| ------------ | --------- | ------- | --------------------------------- |
| `forceMount` | `boolean` | `false` | Force mount for animation control |

---

### N8nDialogContent

**Props**

| Prop                          | Type                             | Default    | Description                           |
| ----------------------------- | -------------------------------- | ---------- | ------------------------------------- |
| `size`                        | `'small' \| 'medium' \| 'large'` | `'medium'` | Dialog width preset                   |
| `forceMount`                  | `boolean`                        | `false`    | Force mount for animation control     |
| `trapFocus`                   | `boolean`                        | `true`     | Trap focus within dialog              |
| `disableOutsidePointerEvents` | `boolean`                        | `true`     | Prevent clicks outside dialog         |
| `showCloseButton`             | `boolean`                        | `true`     | Shows/hides close button in top right |

**Events**

| Event                | Payload | Description                                 |
| -------------------- | ------- | ------------------------------------------- |
| `escapeKeyDown`      | `Event` | Emitted when Escape is pressed              |
| `pointerDownOutside` | `Event` | Emitted when clicking outside (can prevent) |
| `interactOutside`    | `Event` | Emitted on any interaction outside          |
| `openAutoFocus`      | `Event` | Emitted when focus moves into dialog        |
| `closeAutoFocus`     | `Event` | Emitted when focus returns after close      |

**Slots**

| Slot      | Description    |
| --------- | -------------- |
| `default` | Dialog content |

**Size Variants**

| Size     | Width              |
| -------- | ------------------ |
| `small`  | `max-width: 400px` |
| `medium` | `max-width: 520px` |
| `large`  | `max-width: 680px` |
| `xlarge` | `max-width: 960px` |
| `full`   | `max-width: 90dvw` |

---

### N8nDialogHeader

**Slots**

| Slot      | Description                         |
| --------- | ----------------------------------- |
| `default` | Header content (title, description) |

---

### N8nDialogTitle

**Props**

| Prop      | Type      | Default | Description                    |
| --------- | --------- | ------- | ------------------------------ |
| `asChild` | `boolean` | `false` | Merge props onto child element |

**Slots**

| Slot      | Description |
| --------- | ----------- |
| `default` | Title text  |

---

### N8nDialogDescription

**Props**

| Prop      | Type      | Default | Description                    |
| --------- | --------- | ------- | ------------------------------ |
| `asChild` | `boolean` | `false` | Merge props onto child element |

**Slots**

| Slot      | Description      |
| --------- | ---------------- |
| `default` | Description text |

---

### N8nDialogFooter

**Slots**

| Slot      | Description                     |
| --------- | ------------------------------- |
| `default` | Footer content (action buttons) |

---

### N8nDialogClose

**Props**

| Prop      | Type      | Default | Description                                       |
| --------- | --------- | ------- | ------------------------------------------------- |
| `asChild` | `boolean` | `false` | Merges props onto child element instead of button |

**Slots**

| Slot      | Description   |
| --------- | ------------- |
| `default` | Close content |

---

## Accessibility

- Adheres to [WAI-ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- Focus is trapped within dialog when open
- Focus returns to trigger element on close
- `DialogTitle` provides accessible name via `aria-labelledby`
- `DialogDescription` provides accessible description via `aria-describedby`
- Escape key closes the dialog
- Click outside closes the dialog (configurable)

**Icon-only close buttons** should include `aria-label`:

```vue
<N8nDialogClose aria-label="Close dialog">
  <N8nIcon name="x" size="small" />
</N8nDialogClose>
```

---

## Keyboard Interactions

| Key         | Action                                    |
| ----------- | ----------------------------------------- |
| `Tab`       | Moves focus to next focusable element     |
| `Shift+Tab` | Moves focus to previous focusable element |
| `Escape`    | Closes the dialog                         |

---

## Template Usage Examples

```vue
<script setup lang="ts">
import {
	N8nDialogRoot,
	N8nDialogTrigger,
	N8nDialogPortal,
	N8nDialogOverlay,
	N8nDialogContent,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogClose,
} from '@n8n/design-system';
</script>

<template>
	<N8nDialogRoot>
		<N8nDialogTrigger as-child>
			<N8nButton variant="solid">Open Dialog</N8nButton>
		</N8nDialogTrigger>
		<N8nDialogPortal>
			<N8nDialogOverlay />
			<N8nDialogContent>
				<N8nDialogHeader>
					<N8nDialogTitle>Edit Profile</N8nDialogTitle>
					<N8nDialogDescription>
						Make changes to your profile here. Click save when you're done.
					</N8nDialogDescription>
				</N8nDialogHeader>

				<!-- Form content here -->

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="outline">Cancel</N8nButton>
					</N8nDialogClose>
					<N8nButton variant="solid">Save changes</N8nButton>
				</N8nDialogFooter>
			</N8nDialogContent>
		</N8nDialogPortal>
	</N8nDialogRoot>
</template>
```

### Using Slot Props for Programmatic Close

```vue
<template>
	<N8nDialogRoot v-slot="{ close }">
		<N8nDialogTrigger as-child>
			<N8nButton variant="solid">Open Form</N8nButton>
		</N8nDialogTrigger>
		<N8nDialogPortal>
			<N8nDialogOverlay />
			<N8nDialogContent>
				<N8nDialogHeader>
					<N8nDialogTitle>Submit Feedback</N8nDialogTitle>
				</N8nDialogHeader>

				<form @submit.prevent="submitForm().then(close)">
					<!-- Form fields -->
					<N8nDialogFooter>
						<N8nButton variant="outline" type="button" @click="close"> Cancel </N8nButton>
						<N8nButton variant="solid" type="submit"> Submit </N8nButton>
					</N8nDialogFooter>
				</form>
			</N8nDialogContent>
		</N8nDialogPortal>
	</N8nDialogRoot>
</template>
```

### Scrollable Content

```vue
<template>
	<N8nDialogRoot>
		<N8nDialogTrigger as-child>
			<N8nButton variant="outline">View Terms</N8nButton>
		</N8nDialogTrigger>
		<N8nDialogPortal>
			<N8nDialogOverlay />
			<N8nDialogContent :class="$style.scrollableDialog">
				<N8nDialogHeader>
					<N8nDialogTitle>Terms of Service</N8nDialogTitle>
				</N8nDialogHeader>

				<div :class="$style.scrollableContent">
					<!-- Long content here -->
				</div>

				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton variant="outline">Decline</N8nButton>
					</N8nDialogClose>
					<N8nButton variant="solid">Accept</N8nButton>
				</N8nDialogFooter>
			</N8nDialogContent>
		</N8nDialogPortal>
	</N8nDialogRoot>
</template>

<style module lang="scss">
.scrollableDialog {
	max-height: 80vh;
	display: flex;
	flex-direction: column;
}

.scrollableContent {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--sm);
}
</style>
```

---

## Convenience Component: N8nAlertDialog

For common confirmation dialogs, use the `N8nAlertDialog` convenience component. It provides a simpler API for typical alert/confirm patterns while using the composed dialog primitives internally.

### N8nAlertDialog

**Props**

| Prop            | Type                       | Default      | Description                          |
| --------------- | -------------------------- | ------------ | ------------------------------------ |
| `open`          | `boolean`                  | -            | Controlled open state                |
| `defaultOpen`   | `boolean`                  | `false`      | Initial open state (uncontrolled)    |
| `title`         | `string`                   | **required** | Dialog title text                    |
| `description`   | `string`                   | -            | Optional description text            |
| `actionLabel`   | `string`                   | `'Confirm'`  | Label for the action button          |
| `actionVariant` | `'solid' \| 'destructive'` | `'solid'`    | Visual style of the action button    |
| `cancelLabel`   | `string`                   | `'Cancel'`   | Label for the cancel button          |
| `loading`       | `boolean`                  | `false`      | Shows loading state on action button |
| `size`          | `'small' \| 'medium'`      | `'small'`    | Dialog width                         |

**Events**

| Event         | Payload   | Description                           |
| ------------- | --------- | ------------------------------------- |
| `update:open` | `boolean` | Emitted when open state changes       |
| `action`      | -         | Emitted when action button is clicked |
| `cancel`      | -         | Emitted when cancel button is clicked |

**Slots**

| Slot      | Description                                                |
| --------- | ---------------------------------------------------------- |
| `trigger` | Trigger element that opens the dialog                      |
| `default` | Optional additional content between description and footer |

### AlertDialog Usage Examples

#### Basic Confirmation

```vue
<script setup lang="ts">
import { N8nAlertDialog } from '@n8n/design-system';

function handleConfirm() {
	console.log('Confirmed!');
}
</script>

<template>
	<N8nAlertDialog
		title="Save changes?"
		description="Your changes will be saved to the server."
		action-label="Save"
		@action="handleConfirm"
	>
		<template #trigger>
			<N8nButton variant="solid">Save</N8nButton>
		</template>
	</N8nAlertDialog>
</template>
```

### When to Use AlertDialog vs Composed Dialog

| Use Case                        | Component             |
| ------------------------------- | --------------------- |
| Simple confirm/cancel actions   | `N8nAlertDialog`      |
| Delete confirmations            | `N8nAlertDialog`      |
| Forms with multiple fields      | Composed `N8nDialog*` |
| Multi-step wizards              | Composed `N8nDialog*` |
| Custom header with close button | Composed `N8nDialog*` |
| Nested dialogs                  | Composed `N8nDialog*` |
| Non-standard footer layouts     | Composed `N8nDialog*` |
