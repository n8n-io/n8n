<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import { chatEventBus } from '@n8n/chat/event-buses';

const chatBodyRef = ref<HTMLElement | null>(null);

function scrollToBottom() {
	const element = chatBodyRef.value as HTMLElement;
	if (element) {
		element.scrollTop = element.scrollHeight;
	}
}

onMounted(() => {
	chatEventBus.on('scrollToBottom', scrollToBottom);
	window.addEventListener('resize', scrollToBottom);
});

onBeforeUnmount(() => {
	chatEventBus.off('scrollToBottom', scrollToBottom);
	window.removeEventListener('resize', scrollToBottom);
});
</script>
<template>
	<main class="chat-layout">
		<div v-if="$slots.header" class="chat-header">
			<slot name="header" />
		</div>
		<div v-if="$slots.default" ref="chatBodyRef" class="chat-body">
			<slot />
		</div>
		<div v-if="$slots.footer" class="chat-footer">
			<slot name="footer" />
		</div>
	</main>
</template>

<style lang="scss">
.chat-layout {
	width: 100%;
	height: 100%;
	display: flex;
	overflow-y: auto;
	flex-direction: column;
	font-family: var(--chat--font-family);

	.chat-header {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 1em;
		height: var(--chat--header-height);
		padding: var(--chat--header--padding);
		background: var(--chat--header--background);
		color: var(--chat--header--color);
		border-top: var(--chat--header--border-top);
		border-bottom: var(--chat--header--border-bottom);
		border-left: var(--chat--header--border-left);
		border-right: var(--chat--header--border-right);
		h1 {
			font-size: var(--chat--heading--font-size);
			color: var(--chat--header--color);
		}
		p {
			font-size: var(--chat--subtitle--font-size);
			line-height: var(--chat--subtitle--line-height);
		}
	}

	.chat-body {
		background: var(--chat--body--background);
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		position: relative;
		min-height: 100px;
	}

	.chat-footer {
		border-top: 1px solid var(--chat--color-light-shade-100);
		background: var(--chat--footer--background);
		color: var(--chat--footer--color);
	}
}
</style>
