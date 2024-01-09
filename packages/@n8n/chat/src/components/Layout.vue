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
	font-family: var(
		--chat--font-family,
		(
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			Oxygen-Sans,
			Ubuntu,
			Cantarell,
			'Helvetica Neue',
			sans-serif
		)
	);

	.chat-header {
		padding: var(--chat--header--padding, var(--chat--spacing));
		background: var(--chat--header--background, var(--chat--color-dark));
		color: var(--chat--header--color, var(--chat--color-light));
	}

	.chat-body {
		background: var(--chat--body--background, var(--chat--color-light));
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		position: relative;
		min-height: 100px;
	}

	.chat-footer {
		border-top: 1px solid var(--chat--color-light-shade-100);
		background: var(--chat--footer--background, var(--chat--color-light));
		color: var(--chat--footer--color, var(--chat--color-dark));
	}
}
</style>
