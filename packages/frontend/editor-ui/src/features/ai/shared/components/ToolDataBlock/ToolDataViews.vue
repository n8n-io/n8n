<script lang="ts" setup>
import { N8nSegmentControl } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import ToolDataBlock from './ToolDataBlock.vue';
import ToolDataSection from './ToolDataSection.vue';

/**
 * A labelled tool output that a host shows in its own format, such as a table
 * or code. A switch in the label row shows the raw JSON instead, which also
 * holds the fields that the format leaves out. The default slot is the format.
 */
const props = defineProps<{
	label: string;
	/** The raw output, for the JSON view. */
	value: unknown;
	/** The name of the format in the switch, for example "Table". */
	viewLabel: string;
}>();

type OutputView = 'formatted' | 'json';

const i18n = useI18n();
const view = ref<OutputView>('formatted');

const viewOptions = computed(() => [
	{ label: props.viewLabel, value: 'formatted' as const },
	{ label: i18n.baseText('ai.toolData.view.json'), value: 'json' as const },
]);
</script>

<template>
	<ToolDataSection :label="label">
		<template #actions>
			<N8nSegmentControl
				v-model="view"
				:options="viewOptions"
				size="mini"
				data-test-id="ai-tool-data-view-switch"
			/>
		</template>
		<slot v-if="view === 'formatted'" />
		<ToolDataBlock v-else :value="value" />
	</ToolDataSection>
</template>
