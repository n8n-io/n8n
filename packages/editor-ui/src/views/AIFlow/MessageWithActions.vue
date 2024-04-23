<template>
	<div :class="$style.container">
		<p :class="$style.message">{{ message }}</p>
		<div :class="$style.actions">
			<Button
				v-for="action in actions"
				:key="action.action"
				:class="$style.actionButton"
				outline
				type="secondary"
				icon="chevron-right"
				@click="onButtonClick(action)"
			>
				{{ action.label }}
			</Button>
		</div>
	</div>
</template>

<script setup lang="ts">
import Button from 'n8n-design-system/components/N8nButton/Button.vue';

interface MessageAction {
	label: string;
	action: string;
}

const emit = defineEmits<{
	(event: 'actionSelected', value: MessageAction): void;
}>();

defineProps<{
	message: string;
	actions: MessageAction[];
}>();

function onButtonClick(action: MessageAction) {
	emit('actionSelected', action);
}
</script>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}
.actions {
	display: flex;
	flex-direction: column;
	width: 60%;
	gap: 0.5rem;
}
.actionButton {
	display: flex;
	flex-direction: row-reverse;
	justify-content: space-between;
}
</style>
