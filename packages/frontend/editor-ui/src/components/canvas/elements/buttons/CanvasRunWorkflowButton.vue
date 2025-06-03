<script setup lang="ts">
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

defineEmits<{
	mouseenter: [event: MouseEvent];
	mouseleave: [event: MouseEvent];
	click: [event: MouseEvent];
}>();

const props = defineProps<{
	waitingForWebhook?: boolean;
	executing?: boolean;
	disabled?: boolean;
}>();

const i18n = useI18n();

const label = computed(() => {
	if (!props.executing) {
		return i18n.baseText('nodeView.runButtonText.executeWorkflow');
	}

	if (props.waitingForWebhook) {
		return i18n.baseText('nodeView.runButtonText.waitingForTriggerEvent');
	}

	return i18n.baseText('nodeView.runButtonText.executingWorkflow');
});
</script>

<template>
	<KeyboardShortcutTooltip
		:label="label"
		:shortcut="{ metaKey: true, keys: ['↵'] }"
		:disabled="executing"
	>
		<N8nButton
			:loading="executing"
			:label="label"
			:disabled="disabled"
			size="large"
			icon="flask"
			type="primary"
			data-test-id="execute-workflow-button"
			@mouseenter="$emit('mouseenter', $event)"
			@mouseleave="$emit('mouseleave', $event)"
			@click.stop="$emit('click', $event)"
		/>
	</KeyboardShortcutTooltip>
</template>
