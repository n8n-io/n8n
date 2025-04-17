<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { type NodePanelType, type IRunDataDisplayMode } from '@/Interface';
import { N8nIcon, N8nRadioButtons } from '@n8n/design-system';
import { computed } from 'vue';

const { compact, value, hasBinaryData, paneType, nodeGeneratesHtml } = defineProps<{
	compact: boolean;
	value: IRunDataDisplayMode;
	hasBinaryData: boolean;
	paneType: NodePanelType;
	nodeGeneratesHtml: boolean;
}>();

const emit = defineEmits<{ change: [IRunDataDisplayMode] }>();

const i18n = useI18n();
const options = computed(() => {
	const defaults: Array<{ label: string; value: IRunDataDisplayMode }> = [
		{ label: i18n.baseText('runData.schema'), value: 'schema' },
		{ label: i18n.baseText('runData.table'), value: 'table' },
		{ label: i18n.baseText('runData.json'), value: 'json' },
	];

	if (hasBinaryData) {
		defaults.push({ label: i18n.baseText('runData.binary'), value: 'binary' });
	}

	if (paneType === 'output' && nodeGeneratesHtml) {
		defaults.unshift({ label: 'HTML', value: 'html' });
	}

	return defaults;
});
</script>

<template>
	<N8nRadioButtons
		:model-value="value"
		:options="options"
		data-test-id="ndv-run-data-display-mode"
		@update:model-value="(selected) => emit('change', selected)"
	>
		<template v-if="compact" #option="option">
			<N8nIcon v-if="option.value === 'table'" icon="table" size="small" :class="$style.icon" />
			<N8nIcon v-else-if="option.value === 'json'" icon="json" size="small" :class="$style.icon" />
			<N8nIcon
				v-else-if="option.value === 'binary'"
				icon="binary"
				size="small"
				:class="$style.icon"
			/>
			<N8nIcon
				v-else-if="option.value === 'schema'"
				icon="schema"
				size="small"
				:class="$style.icon"
			/>
			<N8nIcon v-else-if="option.value === 'html'" icon="html" size="small" :class="$style.icon" />
			<span v-else>{{ option.label }}</span>
		</template>
	</N8nRadioButtons>
</template>

<style lang="scss" module>
.icon {
	padding-inline: var(--spacing-2xs);
}
</style>
