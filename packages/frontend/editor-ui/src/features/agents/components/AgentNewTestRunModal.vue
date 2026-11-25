<script setup lang="ts">
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import AgentModal from './modals/AgentModal.vue';

const props = withDefaults(
	defineProps<{
		open: boolean;
		/** True while the caller starts the new test run. Blocks dismissal. */
		busy?: boolean;
	}>(),
	{ busy: false },
);

const emit = defineEmits<{
	'update:open': [value: boolean];
	confirm: [];
	cancel: [];
}>();

const i18n = useI18n();

function onOpenChange(open: boolean) {
	// AgentModal already blocks dismissal while busy; guard here too so a reset can't be cancelled mid-start.
	if (open || props.busy) return;
	emit('update:open', false);
	emit('cancel');
}

function onConfirm() {
	if (props.busy) return;
	emit('confirm');
}
</script>

<template>
	<AgentModal
		:open="props.open"
		:title="i18n.baseText('agents.testRun.reset.title')"
		:busy="props.busy"
		size="medium"
		data-testid="agent-new-test-run-modal"
		@update:open="onOpenChange"
	>
		<N8nText tag="p" size="medium" :class="$style.description">
			{{ i18n.baseText('agents.testRun.reset.description') }}
		</N8nText>
		<template #footerActions>
			<N8nButton
				variant="solid"
				:loading="props.busy"
				data-testid="agent-new-test-run-confirm"
				@click="onConfirm"
			>
				{{ i18n.baseText('agents.testRun.reset.confirm') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.description {
	margin: 0;
}
</style>
