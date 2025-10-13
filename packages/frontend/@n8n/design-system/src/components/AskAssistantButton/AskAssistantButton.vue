<script setup lang="ts">
import { ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import AssistantIcon from '../AskAssistantIcon/AssistantIcon.vue';
import AssistantText from '../AskAssistantText/AssistantText.vue';

const { t } = useI18n();

const hovering = ref(false);

const props = defineProps<{ unreadCount?: number; type?: 'assistant' | 'builder' }>();

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
		<AssistantIcon v-else size="large" :theme="hovering ? 'blank' : 'default'" />
		<div v-show="hovering" :class="$style.text">
			<div>
				<AssistantText
					:text="
						type === 'builder'
							? t('assistantChat.builder.name')
							: t('askAssistantButton.askAssistant')
					"
				/>
			</div>
		</div>
	</button>
</template>

<style lang="scss" module>
.button {
	border: var(--border);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	display: flex;
	align-items: center;
	justify-content: center;
	height: 42px;
	width: 42px;
	position: relative;

	&:hover {
		border: 0;
		cursor: pointer;
		background: var(--color-assistant-highlight-reverse);

		> div {
			background: transparent;
		}
	}
}

.num {
	color: var(--prim-color-white);
	background: var(--color-assistant-highlight-reverse);
	border-radius: 50%;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: var(--font-size--3xs);
}

.text {
	position: absolute;
	display: flex;
	flex-direction: column;
	align-items: end;
	width: 100px;
	right: 48px;
}
</style>
