# Component specification

Displays actions at the end of an AI assistant response. `N8nChatActions` provides a consistent action group and a default copy action. `N8nChatAction` provides a consistent icon button for additional actions.

Product-specific behavior stays with the caller. For example, Instance AI can add feedback actions while Agents can add read-aloud or send-to-assistant actions.

- **Component Names:** N8nChatActions, N8nChatAction
- **W3C APG Pattern:** [Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/)

## Public API Definition

### N8nChatActions

A flex container for actions associated with one assistant response.

**Props**

- `showCopy?: boolean` Whether to show the default copy action. Default: `true`.
- `copyLabel?: string` Accessible label and tooltip content for the default copy action. The caller supplies localized text. Required when `showCopy` is `true`.

**Events**

- `copy()` Emitted when the user selects the default copy action. The caller owns clipboard behavior, copied state, error handling, and telemetry.

**Slots**

- `default` Additional actions rendered after the default copy action. Use `N8nChatAction` for consistent presentation.

### N8nChatAction

Wraps `N8nIconButton` and applies the standard chat-action appearance and dimensions.

**Props**

- `icon: IconName` Icon displayed in the button.
- `label: string` Accessible name and tooltip content. The caller supplies localized text.
- `disabled?: boolean` Whether the action is unavailable. Default: `false`.
- `loading?: boolean` Whether the action is in progress. Default: `false`.

All other attributes and listeners pass through to `N8nIconButton`. This includes `aria-pressed`, `data-testid`, and click listeners.

**Presentation defaults**

- `variant`: `'ghost'`
- `size`: `'small'`
- `iconSize`: `'medium'`
- Tooltip placement: `'bottom'`

The component owns these values. Callers cannot override them.

## Accessibility

- Each action must have an accessible name. `label` is required for `N8nChatAction` and is applied as its `aria-label` and tooltip content.
- Toggle actions, such as positive and negative feedback, must set `aria-pressed` to communicate their state.
- Disabled actions use the native button disabled state supplied by `N8nIconButton`.
- The action group does not use toolbar semantics. It is a small set of independent buttons and does not need toolbar keyboard behavior.

## Responsibilities

`N8nChatActions` owns:

- Action layout, spacing, and alignment.
- Placement of the default copy action.
- The default copy button presentation.

`N8nChatAction` owns:

- Button variant and dimensions.
- Icon presentation.
- Tooltip presentation.
- Accessible label forwarding.

The caller owns:

- Message content.
- Clipboard behavior and copied feedback.
- Product-specific actions and state.
- Telemetry and error handling.

## Usage examples

### Default copy action with additional actions

```vue
<script setup lang="ts">
import { N8nChatAction, N8nChatActions } from '@n8n/design-system';

function copyMessage() {
	/* Copy the message and handle copied feedback. */
}

function readMessage() {
	/* Start speech synthesis. */
}
</script>

<template>
	<N8nChatActions copy-label="Copy response" @copy="copyMessage">
		<N8nChatAction icon="volume-2" label="Read aloud" @click="readMessage" />
	</N8nChatActions>
</template>
```

### Product-specific feedback actions

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nChatAction, N8nChatActions } from '@n8n/design-system';

const feedback = ref<'positive' | 'negative'>();

function copyMessage() {
	/* Copy the message. */
}

function submitPositiveFeedback() {
	feedback.value = 'positive';
}

function submitNegativeFeedback() {
	feedback.value = 'negative';
}
</script>

<template>
	<N8nChatActions copy-label="Copy response" @copy="copyMessage">
		<N8nChatAction
			icon="thumbs-up"
			label="Helpful"
			:aria-pressed="feedback === 'positive'"
			@click="submitPositiveFeedback"
		/>
		<N8nChatAction
			icon="thumbs-down"
			label="Not helpful"
			:aria-pressed="feedback === 'negative'"
			@click="submitNegativeFeedback"
		/>
	</N8nChatActions>
</template>
```

### Actions without copy

```vue
<template>
	<N8nChatActions :show-copy="false">
		<N8nChatAction icon="rotate-ccw" label="Try again" @click="tryAgain" />
	</N8nChatActions>
</template>
```

## Implementation notes

- The copy event does not include message content. This keeps message data and clipboard behavior outside the layout component.
- Vue component events do not await listener return values. The caller must manage asynchronous copy state.
- Do not add feedback, speech synthesis, or telemetry logic to either design-system component.
- Add Storybook stories for the default state, additional actions, toggle actions, disabled actions, loading actions, and `showCopy="false"`.
