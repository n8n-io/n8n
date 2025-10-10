<script setup lang="ts">
import N8nButton from '../N8nButton';

export interface N8nSendStopButtonProps {
	streaming?: boolean;
	disabled?: boolean;
	size?: 'mini' | 'small' | 'medium' | 'large';
}

withDefaults(defineProps<N8nSendStopButtonProps>(), {
	streaming: false,
	disabled: false,
	size: 'small',
});

const emit = defineEmits<{
	send: [];
	stop: [];
}>();

function handleSend() {
	emit('send');
}

function handleStop() {
	emit('stop');
}
</script>

<template>
	<N8nButton
		v-if="streaming"
		:class="$style.stopButton"
		type="primary"
		:size="size"
		icon="filled-square"
		icon-size="small"
		square
		@click="handleStop"
	/>
	<N8nButton
		v-else
		:class="$style.sendButton"
		type="primary"
		:size="size"
		icon-size="large"
		square
		icon="arrow-up"
		:disabled="disabled"
		@click="handleSend"
	/>
</template>

<style lang="scss" module>
.sendButton {
	--button-border-radius: var(--radius--lg);
}

.stopButton {
	--button-border-radius: var(--radius--lg);
}
</style>
