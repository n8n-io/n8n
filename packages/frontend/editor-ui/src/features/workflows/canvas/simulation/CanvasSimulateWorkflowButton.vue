<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nTooltip } from '@n8n/design-system';

const props = defineProps<{
	simulating: boolean;
	disabled?: boolean;
	unsupportedCount: number;
}>();

const emit = defineEmits<{
	simulate: [];
}>();

const i18n = useI18n();

const isDisabled = computed(() => props.disabled || props.simulating || props.unsupportedCount > 0);

const tooltipText = computed(() => {
	if (props.unsupportedCount > 0) {
		return i18n.baseText('nodeView.simulate.unsupportedTooltip', {
			interpolate: { count: String(props.unsupportedCount) },
		});
	}
	return i18n.baseText('nodeView.simulate.tooltip');
});

const label = computed(() =>
	props.simulating
		? i18n.baseText('nodeView.simulate.running')
		: i18n.baseText('nodeView.simulate.button'),
);
</script>

<template>
	<div :class="$style.group" data-test-id="simulate-workflow-controls">
		<N8nTooltip placement="top">
			<template #content>{{ tooltipText }}</template>
			<N8nButton
				:class="$style.simulateButton"
				variant="outline"
				size="large"
				icon="flask-conical"
				:loading="simulating"
				:disabled="isDisabled"
				:label="label"
				data-test-id="simulate-workflow-button"
				data-attr="simulate-workflow-button"
				@click="emit('simulate')"
			/>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.group {
	display: inline-flex;
	align-items: center;
	pointer-events: auto;
}

.simulateButton {
	box-shadow: var(--shadow--light);
}
</style>
