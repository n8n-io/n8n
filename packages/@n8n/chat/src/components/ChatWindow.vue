<script lang="ts" setup>
// eslint-disable-next-line import/no-unresolved
import IconChat from 'virtual:icons/mdi/chat';
// eslint-disable-next-line import/no-unresolved
import IconChevronDown from 'virtual:icons/mdi/chevron-down';
import { nextTick, ref } from 'vue';
import Chat from '@n8n/chat/components/Chat.vue';
import { chatEventBus } from '@n8n/chat/event-buses';

const isOpen = ref(false);

function toggle() {
	isOpen.value = !isOpen.value;

	if (isOpen.value) {
		void nextTick(() => {
			chatEventBus.emit('scrollToBottom');
		});
	}
}
</script>

<template>
	<div class="chat-window-wrapper">
		<Transition name="chat-window-transition">
			<div v-show="isOpen" class="chat-window">
				<Chat />
			</div>
		</Transition>
		<div class="chat-window-toggle" @click="toggle">
			<Transition name="chat-window-toggle-transition" mode="out-in">
				<IconChat v-if="!isOpen" height="32" width="32" />
				<IconChevronDown v-else height="32" width="32" />
			</Transition>
		</div>
	</div>
</template>

<style lang="scss">
.chat-window-wrapper {
	position: fixed;
	display: flex;
	flex-direction: column;
	bottom: var(--chat--window--bottom, var(--chat--spacing));
	right: var(--chat--window--right, var(--chat--spacing));
	z-index: var(--chat--window--z-index, 9999);

	max-width: calc(100% - var(--chat--window--right, var(--chat--spacing)) * 2);
	max-height: calc(100% - var(--chat--window--bottom, var(--chat--spacing)) * 2);

	.chat-window {
		display: flex;
		width: var(--chat--window--width);
		height: var(--chat--window--height);
		max-width: 100%;
		max-height: 100%;
		border: var(--chat--window--border, 1px solid var(--chat--color-light-shade-100));
		border-radius: var(--chat--window--border-radius, var(--chat--border-radius));
		margin-bottom: var(--chat--window--margin-bottom, var(--chat--spacing));
		overflow: hidden;
		transform-origin: bottom right;

		.chat-layout {
			width: auto;
			height: auto;
			flex: 1;
		}
	}

	.chat-window-toggle {
		flex: 0 0 auto;
		background: var(--chat--toggle--background);
		color: var(--chat--toggle--color);
		cursor: pointer;
		width: var(--chat--toggle--width, var(--chat--toggle--size));
		height: var(--chat--toggle--height, var(--chat--toggle--size));
		border-radius: var(--chat--toggle--border-radius, 50%);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-left: auto;
		transition:
			transform var(--chat--transition-duration) ease,
			background var(--chat--transition-duration) ease;

		&:hover,
		&:focus {
			transform: scale(1.05);
			background: var(--chat--toggle--hover--background);
		}

		&:active {
			transform: scale(0.95);
			background: var(--chat--toggle--active--background);
		}
	}
}

.chat-window-transition {
	&-enter-active,
	&-leave-active {
		transition:
			transform var(--chat--transition-duration) ease,
			opacity var(--chat--transition-duration) ease;
	}

	&-enter-from,
	&-leave-to {
		transform: scale(0);
		opacity: 0;
	}
}

.chat-window-toggle-transition {
	&-enter-active,
	&-leave-active {
		transition: opacity var(--chat--transition-duration) ease;
	}

	&-enter-from,
	&-leave-to {
		opacity: 0;
	}
}
</style>
