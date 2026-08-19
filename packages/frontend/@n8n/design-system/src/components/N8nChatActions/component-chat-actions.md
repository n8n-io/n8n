# N8nChatActions

Displays actions for an assistant message. The component provides copy and read-aloud actions and accepts more actions through its default slot.

- **Component name:** `N8nChatActions`
- **W3C APG patterns:** [Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/) and [Group](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/#naming_role_guidance)

## Public API

### Copy action

- `showCopy?: true` shows the copy action. It is shown by default.
- `copyLabel?: string` replaces the localized `Copy` tooltip and accessible label.
- `onCopy: () => void` is required when the copy action is shown.

Set `showCopy` to `false` to hide the action. In this state, `copyLabel` and `onCopy` are not accepted.

### Read-aloud action

- `showReadAloud?: true` shows the read-aloud action. It is shown by default.
- `readAloudLabel: string` sets the tooltip and accessible label.
- `onReadAloud: () => void` is required when the read-aloud action is shown.

Set `showReadAloud` to `false` to hide the action. In this state, `readAloudLabel` and `onReadAloud` are not accepted.

The implementation has a localized `Read aloud` fallback. The public type still requires `readAloudLabel` when the action is shown so that callers make the accessible name explicit.

### Events

- `copy()` is emitted when the copy button is selected.
- `readAloud()` is emitted when the read-aloud button is selected.

The events have no payload. The caller owns clipboard access, speech synthesis, feedback, errors, and telemetry.

### Slots

- `default` renders custom actions after the built-in actions.

Custom actions must provide their own tooltip, accessible name, state, and behavior.

## Presentation

The built-in actions use `N8nIconButton` with these values:

- `variant="ghost"`
- `size="small"`
- `icon-size="medium"`
- Tooltip placement: `bottom`

The action container uses a flex row with `var(--spacing--4xs)` between actions.

## Accessibility

- The container has `role="group"` and the localized accessible name `Message actions`.
- Each built-in action has the same text for its tooltip and `aria-label`.
- The buttons remain in the normal Tab sequence.
- The component does not use toolbar semantics or arrow-key navigation.
- Toggle actions supplied through the slot must use `aria-pressed`.
- Custom disabled actions must use the button's disabled state.

## Usage

### Both built-in actions

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nChatActions } from '@n8n/design-system';

const message = ref('The workflow is ready.');

function copyMessage() {
	void navigator.clipboard.writeText(message.value);
}

function readMessageAloud() {
	speechSynthesis.speak(new SpeechSynthesisUtterance(message.value));
}
</script>

<template>
	<N8nChatActions
		copy-label="Copy"
		read-aloud-label="Read aloud"
		@copy="copyMessage"
		@read-aloud="readMessageAloud"
	/>
</template>
```

### Copy only

```vue
<template>
	<N8nChatActions
		copy-label="Copy"
		:show-read-aloud="false"
		@copy="copyMessage"
	/>
</template>
```

### Read aloud only

```vue
<template>
	<N8nChatActions
		:show-copy="false"
		read-aloud-label="Read aloud"
		@read-aloud="readMessageAloud"
	/>
</template>
```

### Custom feedback actions

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nChatActions, N8nIconButton, N8nTooltip } from '@n8n/design-system';

const feedback = ref<'positive' | 'negative'>();

function submitPositiveFeedback() {
	feedback.value = 'positive';
}

function submitNegativeFeedback() {
	feedback.value = 'negative';
}
</script>

<template>
	<N8nChatActions
		copy-label="Copy"
		read-aloud-label="Read aloud"
		@copy="copyMessage"
		@read-aloud="readMessageAloud"
	>
		<N8nTooltip content="Helpful" placement="bottom">
			<N8nIconButton
				icon="thumbs-up"
				variant="ghost"
				size="small"
				icon-size="medium"
				aria-label="Helpful"
				:aria-pressed="feedback === 'positive'"
				@click="submitPositiveFeedback"
			/>
		</N8nTooltip>
		<N8nTooltip content="Not helpful" placement="bottom">
			<N8nIconButton
				icon="thumbs-down"
				variant="ghost"
				size="small"
				icon-size="medium"
				aria-label="Not helpful"
				:aria-pressed="feedback === 'negative'"
				@click="submitNegativeFeedback"
			/>
		</N8nTooltip>
	</N8nChatActions>
</template>
```

## Implementation notes

- The conditional prop types require an event handler for each visible built-in action.
- Vue component events do not wait for asynchronous listeners.
- Product-specific actions belong in the default slot.
- The Storybook stories cover both built-in actions, each action by itself, emitted events, and custom feedback actions.
