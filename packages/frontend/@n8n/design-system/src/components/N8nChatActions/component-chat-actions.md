# N8nChatActions

Displays actions for an assistant message. The component copies message content to the clipboard, reads it aloud when speech synthesis is available, and accepts more actions through its default slot.

- **Component name:** `N8nChatActions`
- **W3C APG patterns:** [Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/) and [Group](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/#naming_role_guidance)

## Public API

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `content` | `string` | Required | Message content used by the copy and read-aloud actions. |
| `showCopy` | `boolean` | `true` | Shows the copy action. |
| `copyLabel` | `string` | Localized `Copy` | Sets the copy tooltip and accessible label. |
| `copyTestId` | `string` | `undefined` | Sets `data-test-id` on the copy button. |
| `onCopy` | `(result: ChatActionCopyResult) => void` | `undefined` | Reports the result of a copy attempt. |
| `showReadAloud` | `boolean` | `true` | Shows the read-aloud action when the browser supports speech synthesis. |
| `readAloudLabel` | `string` | Localized `Read aloud` | Sets the tooltip and accessible label used before speech starts. |
| `stopReadingLabel` | `string` | Localized `Stop reading` | Sets the tooltip and accessible label used while speech is active. |
| `readAloudTestId` | `string` | `undefined` | Sets `data-test-id` on the read-aloud button. |
| `onReadAloud` | `(result: ChatActionReadAloudResult) => void` | `undefined` | Reports when speech starts, stops, or ends. |

### Callback results

The copy callback receives the message text and one of these statuses:

- `success`: The clipboard write completed.
- `error`: The clipboard write failed.

The read-aloud callback receives the message text and one of these statuses:

- `started`: Speech started after the user selected the action.
- `stopped`: The user selected the action while speech was active.
- `ended`: Speech reached its end without a user stop.

The callbacks are optional. The component owns clipboard access, speech synthesis, visual feedback, and cleanup. Consumers can use the callbacks for telemetry or other product behavior.

### Slots

- `default` renders custom actions after the built-in actions.

Custom actions must provide their own tooltip, accessible name, state, and behavior.

## Behavior

### Copy

The component writes `content` to the clipboard. After a successful copy, it replaces the copy icon with a check icon and shows the localized `Copied` label for two seconds. A failed copy does not show this success state.

### Read aloud

The component only shows the read-aloud action when all these conditions are true:

- `showReadAloud` is `true`.
- The browser supports speech synthesis.

Selecting the action starts speech for `content`. Selecting it again while speech is active stops speech. If `content` changes during speech, the component stops the current speech. It also stops active speech when it unmounts.

The component uses the browser speech defaults with pitch, rate, and volume set to `1`.

## Presentation

The action container uses a flex row with `var(--spacing--4xs)` between actions.

The copy action uses `N8nButton` with these values:

- `variant="ghost"`
- `size="small"`
- `icon-only`

The read-aloud action uses `N8nIconButton` with these values:

- `variant="ghost"`
- `size="small"`
- `icon-size="medium"`

Both tooltips use `placement="bottom"`.

## Accessibility

- The container has `role="group"` and the localized accessible name `Message actions`.
- Each built-in action uses the tooltip text as its `aria-label`.
- The buttons remain in the normal Tab sequence.
- The read-aloud button uses `aria-pressed` to expose its active state.
- The component does not use toolbar semantics or arrow-key navigation.
- Toggle actions supplied through the slot must use `aria-pressed`.
- Custom disabled actions must use the button's disabled state.

## Usage

### Default actions

```vue
<script setup lang="ts">
import { N8nChatActions } from '@n8n/design-system';

function reportCopy(result: { text: string; status: 'success' | 'error' }) {
	console.info('Copy result', result.status);
}

function reportReadAloud(result: {
	text: string;
	status: 'started' | 'stopped' | 'ended';
}) {
	console.info('Read-aloud result', result.status);
}
</script>

<template>
	<N8nChatActions
		content="The workflow is ready."
		@copy="reportCopy"
		@read-aloud="reportReadAloud"
	/>
</template>
```

Labels use the design-system locale by default. Supply label props when the product needs different text.

### Copy only

```vue
<template>
	<N8nChatActions
		content="The workflow is ready."
		:show-read-aloud="false"
		@copy="reportCopy"
	/>
</template>
```

### Read aloud only

```vue
<template>
	<N8nChatActions
		content="The workflow is ready."
		:show-copy="false"
		@read-aloud="reportReadAloud"
	/>
</template>
```

### Custom actions

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nChatActions, N8nIconButton, N8nTooltip } from '@n8n/design-system';

const isHelpful = ref(false);

function toggleHelpful() {
	isHelpful.value = !isHelpful.value;
}
</script>

<template>
	<N8nChatActions content="The workflow is ready.">
		<N8nTooltip content="Helpful" placement="bottom">
			<N8nIconButton
				icon="thumbs-up"
				variant="ghost"
				size="small"
				icon-size="medium"
				aria-label="Helpful"
				:aria-pressed="isHelpful"
				@click="toggleHelpful"
			/>
		</N8nTooltip>
	</N8nChatActions>
</template>
```

## Implementation notes

- Vue maps `@copy` and `@read-aloud` listeners to the `onCopy` and `onReadAloud` callback props.
- Product-specific actions belong in the default slot.
- The component clears the copy feedback timer when it unmounts.
