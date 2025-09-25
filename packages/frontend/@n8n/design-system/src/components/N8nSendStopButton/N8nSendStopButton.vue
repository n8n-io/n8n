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
	size: 'mini',
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
		square
		@click="handleStop"
	>
		<div :class="$style.stopIcon">
			<svg
				width="10"
				height="10"
				viewBox="0 0 10 10"
				fill="currentColor"
				overflow="hidden"
				xmlns="http://www.w3.org/2000/svg"
			>
				<rect x="0" y="0" width="10" height="10" rx="2" ry="2" />
			</svg>
		</div>
	</N8nButton>
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
	--button-background-color: var(--color-primary);
	--button-color: var(--color-text-xlight);
	--button-border-color: var(--color-primary);
	--button-border-radius: var(--border-radius-large);
	min-height: 24px;
	min-width: 24px;

	&:hover:not(:disabled) {
		--button-background-color: var(--color-primary-shade-1);
		--button-border-color: var(--color-primary-shade-1);
	}

	&:disabled {
		opacity: 0.5;
	}
}

.stopButton {
	--button-border-radius: var(--border-radius-large);
	--button-padding-horizontal: 0;
	min-height: 24px;
	min-width: 24px;
}

.stopIcon {
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
