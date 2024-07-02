<script setup lang="ts">
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { computed } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useUIStore } from '@/stores/ui.store';

defineEmits(['click']);

const uiStore = useUIStore();
const locale = useI18n();

const workflowRunning = computed(() => uiStore.isActionActive('workflowRunning'));

const runButtonText = computed(() => {
	if (!workflowRunning.value) {
		return locale.baseText('nodeView.runButtonText.executeWorkflow');
	}

	return locale.baseText('nodeView.runButtonText.executingWorkflow');
});
</script>

<template>
	<KeyboardShortcutTooltip :label="runButtonText" :shortcut="{ metaKey: true, keys: ['↵'] }">
		<N8nButton
			:loading="workflowRunning"
			:label="runButtonText"
			size="large"
			icon="flask"
			type="primary"
			data-test-id="execute-workflow-button"
			@click.stop="$emit('click', $event)"
		/>
	</KeyboardShortcutTooltip>
</template>
