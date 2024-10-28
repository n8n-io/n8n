<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import Button from 'n8n-design-system/components/N8nButton/Button.vue';

type QuickReply = {
	label: string;
	key: string;
};

const locale = useI18n();

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

<template>
	<div :class="$style.container">
		<p :class="$style.hint">{{ locale.baseText('aiAssistantChat.quickReply.title') }}</p>
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

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
	width: auto;
	justify-content: flex-end;
	align-items: flex-end;
}
.suggestions {
	display: flex;
	flex-direction: column;
	width: fit-content;
	gap: var(--spacing-4xs);
}
.hint {
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
}
.replyButton {
	display: flex;
	background: var(--chat--color-white);
}
</style>
