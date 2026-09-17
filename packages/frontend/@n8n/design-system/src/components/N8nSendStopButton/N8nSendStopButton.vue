<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';

defineOptions({ name: 'N8nSendStopButton' });

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
		icon-size="small"
		:data-test-id="stopButtonTestId"
		@click="handleStop"
	>
		<template #icon>
			<N8nIcon icon="filled-square" size="small" />
		</template>
	</N8nButton>
	<N8nButton
		v-else
		variant="solid"
		:size="size"
		icon-size="large"
		:icon-only="!label"
		:aria-label="label ? undefined : t('sendStopButton.send')"
		:disabled="disabled"
		:data-test-id="sendButtonTestId"
		@click="handleSend"
	>
		<template v-if="!label" #icon>
			<N8nIcon icon="arrow-up" size="large" />
		</template>
		{{ label }}
	</N8nButton>
</template>
