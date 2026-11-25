<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import type { IRunDataDisplayMode } from '@/Interface';
import { computed, watch } from 'vue';
import type { IconName } from '@n8n/design-system';
import type { RunDataDisplayModeContribution } from '@n8n/frontend-module-sdk';
import { isBuiltInDisplayMode } from '@/features/ndv/shared/ndv.utils';
import { iconFor } from './runDataDisplayModeIcons';

import { N8nIcon, N8nSegmentControl } from '@n8n/design-system';
const {
	compact,
	value,
	hasBinaryData,
	hasRenderableData,
	registeredDisplayModes = [],
} = defineProps<{
	compact: boolean;
	value: IRunDataDisplayMode;
	hasBinaryData: boolean;
	hasRenderableData: boolean;
	registeredDisplayModes?: RunDataDisplayModeContribution[];
}>();

const emit = defineEmits<{ change: [IRunDataDisplayMode] }>();

const i18n = useI18n();

function optionIcon(mode: IRunDataDisplayMode): IconName | undefined {
	return iconFor(mode) ?? registeredDisplayModes.find((registered) => registered.id === mode)?.icon;
}

const options = computed(() => {
	const defaults: Array<{ label: string; value: IRunDataDisplayMode }> = [
		{ label: i18n.baseText('runData.schema'), value: 'schema' },
		{ label: i18n.baseText('runData.table'), value: 'table' },
		{ label: i18n.baseText('runData.json'), value: 'json' },
	];

	if (hasBinaryData) {
		defaults.push({ label: i18n.baseText('runData.binary'), value: 'binary' });
	}

	defaults.unshift(
		...registeredDisplayModes.map((mode) => ({ label: mode.label(), value: mode.id })),
	);

	if (hasRenderableData) {
		defaults.unshift({ label: i18n.baseText('runData.rendered'), value: 'ai' });
	}

	return defaults;
});

watch(
	[() => value, options],
	([val, opts]) => {
		if (opts.length > 0 && opts.every((opt) => opt.value !== val)) {
			const fallback = opts.find((opt) => isBuiltInDisplayMode(opt.value)) ?? opts[0];
			emit('change', fallback.value);
		}
	},
	{ immediate: true },
);
</script>

<template>
	<N8nSegmentControl
		:model-value="value"
		:options="options"
		data-test-id="ndv-run-data-display-mode"
		:size="compact ? 'small' : 'default'"
		:square-buttons="compact"
		@update:model-value="(selected) => emit('change', selected)"
	>
		<template v-if="compact" #option="option">
			<N8nIcon v-if="optionIcon(option.value)" :icon="optionIcon(option.value)!" size="small" />
			<span v-else>{{ option.label }}</span>
		</template>
	</N8nSegmentControl>
</template>
