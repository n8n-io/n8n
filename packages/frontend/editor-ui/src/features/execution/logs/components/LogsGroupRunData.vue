<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { NodePanelType } from '@/features/ndv/shared/ndv.types';
import type { LogEntry } from '@/features/execution/logs/logs.types';
import type { SearchShortcut } from '@/features/workflows/canvas/canvas.types';
import LogsViewRunData from '@/features/execution/logs/components/LogsViewRunData.vue';
import LogsGroupPortSelect from '@/features/execution/logs/components/LogsGroupPortSelect.vue';

const props = withDefaults(
	defineProps<{
		entries: LogEntry[];
		defaultEntry: LogEntry;
		paneType: NodePanelType;
		title: string;
		collapsingTableColumnName: string | null;
		searchShortcut?: SearchShortcut;
		showRedactedOverlay?: boolean;
	}>(),
	{ showRedactedOverlay: true },
);

const emit = defineEmits<{
	collapsingTableColumnChanged: [columnName: string | null];
}>();

const defaultIndex = computed(() => {
	const idx = props.entries.findIndex((e) => e.node.id === props.defaultEntry.node.id);
	return idx >= 0 ? idx : 0;
});

const selectedIndex = ref(defaultIndex.value);

// Keep the selection valid as the group's members change between runs, and
// re-default to the boundary member when the list changes.
watch(
	() => props.entries,
	(entries) => {
		if (selectedIndex.value >= entries.length) {
			selectedIndex.value = defaultIndex.value;
		}
	},
);

const selectedEntry = computed(() => props.entries[selectedIndex.value]);
const dataTestId = computed(() =>
	props.paneType === 'input' ? 'log-details-input' : 'log-details-output',
);
</script>

<template>
	<div :class="$style.container">
		<LogsViewRunData
			v-if="selectedEntry"
			:class="$style.runData"
			:data-test-id="dataTestId"
			:pane-type="paneType"
			:title="title"
			:log-entry="selectedEntry"
			:enable-run-selection="true"
			:collapsing-table-column-name="collapsingTableColumnName"
			:search-shortcut="searchShortcut"
			:show-redacted-overlay="showRedactedOverlay"
			@collapsing-table-column-changed="emit('collapsingTableColumnChanged', $event)"
		>
			<template v-if="entries.length > 1" #run-selector-prepend>
				<LogsGroupPortSelect
					:entries="entries"
					:model-value="selectedIndex"
					:aria-label="title"
					@update:model-value="selectedIndex = $event"
				/>
			</template>
		</LogsViewRunData>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	width: 100%;
	overflow: hidden;
}

.runData {
	flex: 1;
	min-height: 0;
}
</style>
