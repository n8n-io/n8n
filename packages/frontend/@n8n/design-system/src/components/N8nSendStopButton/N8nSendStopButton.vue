<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';

const { t } = useI18n();

export interface N8nSendStopButtonProps {
	streaming?: boolean;
	disabled?: boolean;
	size?: 'mini' | 'small' | 'medium' | 'large';
	label?: string;
	sendButtonTestId?: string;
	stopButtonTestId?: string;
}

withDefaults(defineProps<N8nSendStopButtonProps>(), {
	streaming: false,
	disabled: false,
	size: 'medium',
	label: undefined,
	sendButtonTestId: 'send-message-button',
	stopButtonTestId: 'send-message-button',
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
		variant="solid"
		icon-only
		:aria-label="t('sendStopButton.stop')"
		:size="size"
		icon="filled-square"
		icon-size="small"
		:data-test-id="stopButtonTestId"
		@click="handleStop"
	/>
	<N8nButton
		v-else
		variant="solid"
		:size="size"
		icon-size="large"
		:icon-only="!label"
		:icon="label ? undefined : 'arrow-up'"
		:aria-label="label ? undefined : t('sendStopButton.send')"
		:disabled="disabled"
		:data-test-id="sendButtonTestId"
		@click="handleSend"
	>
		{{ label }}
	</N8nButton>
</template>
