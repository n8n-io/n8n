<script lang="ts" setup>
import { computed } from 'vue';

import { useOptions } from '@n8n/chat/composables';

const { options } = useOptions();
const emit = defineEmits<{
	select: [message: string];
}>();

const prompts = computed(() => {
	const items = options.starterPrompts;
	if (!items) return [];
	return items.map((item) => {
		if (typeof item === 'string') {
			return { label: item, message: item };
		}
		return item;
	});
});

function onSelect(message: string) {
	emit('select', message);
}
</script>

<template>
	<div v-if="prompts.length > 0" class="starter-prompts">
		<button
			v-for="(prompt, index) in prompts"
			:key="index"
			class="starter-prompt-button"
			@click="onSelect(prompt.message)"
		>
			{{ prompt.label }}
		</button>
	</div>
</template>

<style lang="scss">
.starter-prompts {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: var(--chat--spacing, 1rem);
	margin-top: var(--chat--spacing, 1rem);
}

.starter-prompt-button {
	background: var(--chat--starter-prompt--background, var(--chat--color-white, #fff));
	color: var(--chat--starter-prompt--color, var(--chat--color--primary, #e74266));
	border: var(--chat--starter-prompt--border, 1px solid var(--chat--color--primary, #e74266));
	border-radius: var(--chat--starter-prompt--border-radius, var(--chat--border-radius, 0.25rem));
	padding: calc(var(--chat--spacing, 1rem) / 2) var(--chat--spacing, 1rem);
	cursor: pointer;
	text-align: right;
	font-family: inherit;
	font-size: var(--chat--message--font-size, 1rem);
	transition:
		background-color 0.2s ease,
		color 0.2s ease;

	&:hover {
		background: var(
			--chat--starter-prompt--hover--background,
			var(--chat--color--primary, #e74266)
		);
		color: var(--chat--starter-prompt--hover--color, var(--chat--color-white, #fff));
	}
}
</style>
