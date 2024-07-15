<script setup lang="ts">
import { ref } from 'vue';
import AssistantIcon from '../N8nAskAssistantButton/AssistantIcon.vue';
import AssistantText from '../N8nAskAssistantButton/AssistantText.vue';

const hovering = ref(false);

const props = defineProps<{ unreadCount?: number }>();

const emit = defineEmits<{
	click: [e: MouseEvent];
}>();

const onClick = (e: MouseEvent) => emit('click', e);

function onMouseEnter() {
	hovering.value = true;
}

function onMouseLeave() {
	hovering.value = false;
}
</script>

<template>
	<button
		:class="$style.button"
		@mouseenter="onMouseEnter"
		@mouseleave="onMouseLeave"
		@click="onClick"
	>
		<div v-if="props.unreadCount" :class="$style.num">
			{{ props.unreadCount }}
		</div>
		<AssistantIcon v-else :size="18" :style="hovering ? 'blank' : 'default'" />
		<div v-show="hovering" :class="$style.text">
			<div>
				<AssistantText text="Ask Assistant" />
			</div>
			<div>
				<div :class="$style.beta">beta</div>
			</div>
		</div>
	</button>
</template>

<style lang="scss" module>
.button {
	border: var(--border-base);
	background: var(--color-foreground-xlight);
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 42px;
	width: 42px;
	position: relative;

	&:hover {
		border: 0;
		cursor: pointer;
		background: linear-gradient(
			108.82deg,
			rgba(236, 123, 142) 0%,
			rgba(170, 123, 236) 50.5%,
			rgba(91, 96, 232) 100%
		);

		> div {
			background: transparent;
		}
	}
}

.num {
	color: #fff;
	background: linear-gradient(
		108.82deg,
		rgba(236, 123, 142) 0%,
		rgba(170, 123, 236) 50.5%,
		rgba(91, 96, 232) 100%
	);
	border-radius: 50%;
	width: 16px;
	height: 16px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 10px;
}

.text {
	position: absolute;
	width: 100px;
	right: 48px;

	> * {
		float: right;
		line-height: 12px;
	}
}

.beta {
	display: inline-block;

	color: var(--color-secondary);
	font-size: 10px;
	font-weight: 600;
	line-height: 10px; /* 100% */
	background-color: var(--color-secondary-tint-3);
	padding: 1px 4px 2px 4px;
	border-radius: 16px;
}
</style>
