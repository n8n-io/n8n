<script lang="ts" setup>
import { ref } from 'vue';
import { useElementOverflow } from '@n8n/composables/useElementOverflow';
import { N8nText, N8nTooltip } from '@n8n/design-system';

const props = defineProps<{
	label: string;
	apiKey: string;
}>();

const labelEl = ref<HTMLElement | null>(null);
const { isOverflowing } = useElementOverflow(labelEl, 'x', [() => props.label]);
</script>

<template>
	<div :class="$style.cell">
		<N8nTooltip
			:content="label"
			:show-after="500"
			:disabled="!isOverflowing"
			:content-class="$style.tooltip"
		>
			<span ref="labelEl" :class="$style.label">
				<N8nText bold>{{ label }}</N8nText>
			</span>
		</N8nTooltip>
		<N8nText size="small" color="text-light" :class="$style.redacted">
			{{ apiKey }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.cell {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.label {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.redacted {
	font-family: var(--font-family--monospace);
}

:global(.n8n-tooltip).tooltip {
	max-width: none;
	white-space: nowrap;
}
</style>
