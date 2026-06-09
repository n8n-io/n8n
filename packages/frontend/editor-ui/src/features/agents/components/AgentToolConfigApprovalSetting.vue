<script setup lang="ts">
import { N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	modelValue: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.approvalRow">
		<div :class="$style.approvalText">
			<N8nText size="small" :bold="true">
				{{ i18n.baseText('agents.toolConfig.approval.label') }}
			</N8nText>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.toolConfig.approval.hint') }}
			</N8nText>
		</div>
		<N8nSwitch2
			:model-value="modelValue"
			data-test-id="agent-tool-approval-toggle"
			@update:model-value="emit('update:modelValue', $event)"
		/>
	</div>
</template>

<style lang="scss" module>
.approvalRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--2xs);
	margin-right: var(--spacing--lg);
}

.approvalText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}
</style>
