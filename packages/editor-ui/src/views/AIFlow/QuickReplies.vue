<template>
	<div :class="$style.container">
		<p :class="$style.hint">Quick reply 👇</p>
		<div :class="$style.suggestions">
			<Button
				v-for="action in suggestions"
				:key="action.key"
				:class="$style.replyButton"
				outline
				type="secondary"
				@click="onButtonClick(action)"
			>
				{{ action.label }}
			</Button>
		</div>
	</div>
</template>

<script setup lang="ts">
import Button from 'n8n-design-system/components/N8nButton/Button.vue';

interface QuickReply {
	label: string;
	key: string;
}

const emit = defineEmits<{
	(event: 'replySelected', value: QuickReply): void;
}>();

defineProps<{
	suggestions: QuickReply[];
}>();

function onButtonClick(action: QuickReply) {
	emit('replySelected', action);
}
</script>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
	width: auto;
	justify-content: flex-end;
	align-items: end;
}
.suggestions {
	display: flex;
	flex-direction: column;
	width: fit-content;
	gap: var(--spacing-2xs);
}
.hint {
	color: var(--color-text-lighter);
	font-size: var(--font-size-2xs);
}
.replyButton {
	display: flex;
	background: var(--chat--color-white);
	// flex-direction: row-reverse;
	// justify-content: space-between;
}
</style>
