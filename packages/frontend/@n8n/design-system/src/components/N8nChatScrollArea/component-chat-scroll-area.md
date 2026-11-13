# N8nChatScrollArea

Shows a chat conversation in a full-width scroll area with an input overlay at the bottom. Keeps the newest content in view while the user is at the bottom. Stops moving the view after the user scrolls up. Shows a button that scrolls back to the bottom.

## API Contract

```typescript
interface ChatScrollAreaProps {
	/**
	 * Keeps the newest content in view while the user is at the bottom.
	 * When `false`, the view never moves on its own.
	 * @default true
	 */
	follow?: boolean;
	/**
	 * Set to `true` while the parent loads older messages. Stops repeated
	 * `load-older` events. When it changes from `true` to `false`, the
	 * component keeps the visible message in the same position.
	 * @default false
	 */
	loadingOlder?: boolean;
}

interface ChatScrollAreaEmits {
	/**
	 * Emitted when the top of the list becomes visible. The parent loads the
	 * next page of older messages and sets `loadingOlder` during the load.
	 * Emitted again after the load when the top is still visible. The parent
	 * must stop when there are no more pages or when a load fails.
	 */
	'load-older': [];
	/** Emitted when the user arrives at the bottom or leaves it. */
	'update:atBottom': [value: boolean];
}

interface ChatScrollAreaSlots {
	/**
	 * The message list.
	 */
	default(): unknown;
	/**
	 * The content of the bottom overlay, usually the chat input. It can also
	 * include panels that show above the input, such as setup or confirmation
	 * panels. Put them in one container.
	 */
	input(): unknown;
}

interface ChatScrollAreaExposed {
	/** Jumps to the bottom without animation and starts following again. */
	scrollToBottom(): void;
}
```

## Example

**Agents chat:**

```vue
<script setup lang="ts">
import { N8nChatScrollArea } from '@n8n/design-system';
</script>

<template>
	<N8nChatScrollArea>
		<AgentChatMessageList :messages="messages" />
		<template #input>
			<AgentChatInput @send="onSend" />
		</template>
	</N8nChatScrollArea>
</template>
```

**Instance AI with older messages and a setup panel:**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nChatScrollArea } from '@n8n/design-system';

const loadingOlder = ref(false);

async function onLoadOlder() {
	if (!thread.hasOlderMessages) return;
	loadingOlder.value = true;
	await thread.loadOlderMessages();
	loadingOlder.value = false;
}
</script>

<template>
	<N8nChatScrollArea :loading-older="loadingOlder" @load-older="onLoadOlder">
		<InstanceAiMessageList :thread="thread" />
		<template #input>
			<div :class="$style.dock">
				<InstanceAiSetupPanel v-if="setupPending" />
				<InstanceAiInput v-else />
			</div>
		</template>
	</N8nChatScrollArea>
</template>
```

**Pause following during a replay:**

```vue
<template>
	<N8nChatScrollArea :follow="!isReplaying">
		<AgentChatMessageList :messages="messages" />
	</N8nChatScrollArea>
</template>
```

## Structure

```text
N8nChatScrollArea                # position: relative; height: 100%
├── .viewport                    # overflow-y: auto; full width.
│   ├── .topSentinel             # IntersectionObserver → load-older
│   ├── slot default 						 # message list   
		└── ScrollDownButton   			 # Optional shown if last message isn't in view
│   ├── .spacer          
│   └── .bottomSentinel          # IntersectionObserver → isAtBottom
│                                # overflow-anchor: auto
└── .inputOverlay                # position: absolute; bottom: 0; fade
    ├── N8nIconButton            # arrow-down; v-if="!isAtBottom"
    └── slot input               # ResizeObserver → --chat--input--height
```

## Behaviour

- **First render with a loaded history:** jump to the bottom one time, with no animation.
- **User is at the bottom and content grows** (new message, streamed text, tool call, card): keep the bottom in view.
- **User scrolled up and content grows:** do not move the view. Show the scroll button.
- **User scrolled up and sends a message:** do not move the view. Show the scroll button.
- **User scrolls back to the bottom:** hide the button. Follow content again.
- **User clicks the scroll button:** scroll smoothly to the bottom. Follow content again.
- **Older messages load at the top:** keep the visible message in the same position. Use the element at the top of the view as the anchor, so content that grows below the view during the load does not move it. Do not rely on `overflow-anchor`, because Safari supports it only from version 27.
- **Before the first jump to the bottom:** do not emit `load-older`. The view starts at the top for one frame.
- **User presses `End` or `Ctrl+End` while the message list has focus:** go to the bottom. Follow content again.
- **Host calls `scrollToBottom()`** (for example, from an app-wide shortcut): jump to the bottom with no animation. Follow content again.
- **Thread is too short to scroll:** emit `load-older` after the first render. Emit it again after each load while the top stays visible. Hide the button.

The user's scroll position is the only signal that pauses or resumes following. 
Only the user moves the view, with the exception of the first render.

## Open questions

- Does any host need `follow`? If no host turns following off while the user is at the bottom, remove the prop.
- Does the user's own message need to be visible on send in some flows? The current decision is no.
