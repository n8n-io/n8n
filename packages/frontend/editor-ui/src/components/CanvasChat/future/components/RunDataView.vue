<script setup lang="ts">
import RunData from '@/components/RunData.vue';
import { type LogEntry } from '@/components/RunDataAi/utils';
import { useI18n } from '@/composables/useI18n';
import { type IExecutionResponse, type NodePanelType } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { N8nLink, N8nText } from '@n8n/design-system';
import { uniq } from 'lodash-es';
import { type Workflow } from 'n8n-workflow';
import { computed } from 'vue';
import { I18nT } from 'vue-i18n';

const { title, logEntry, paneType, workflow, execution } = defineProps<{
	title: string;
	paneType: NodePanelType;
	logEntry: LogEntry;
	workflow: Workflow;
	execution: IExecutionResponse;
}>();

const locale = useI18n();
const ndvStore = useNDVStore();
const parentNodeNames = computed(() =>
	uniq(workflow.getParentNodesByDepth(logEntry.node.name, 1)).map((c) => c.name),
);
const node = computed(() => {
	if (logEntry.depth > 0 || paneType === 'output') {
		return logEntry.node;
	}

	return parentNodeNames.value.length > 0 ? workflow.getNode(parentNodeNames.value[0]) : undefined;
});
const isMultipleInput = computed(() => paneType === 'input' && parentNodeNames.value.length > 1);

function handleClickOpenNdv() {
	ndvStore.setActiveNodeName(logEntry.node.name);
}
</script>

<template>
	<RunData
		v-if="node"
		:node="node"
		:workflow="workflow"
		:workflow-execution="execution"
		:run-index="logEntry.runIndex"
		:too-much-data-title="locale.baseText('ndv.output.tooMuchData.title')"
		:no-data-in-branch-message="locale.baseText('ndv.output.noOutputDataInBranch')"
		:executing-message="locale.baseText('ndv.output.executing')"
		:pane-type="paneType"
		:disable-run-index-selection="true"
		:compact="true"
		:disable-pin="true"
		:disable-edit="true"
		:disable-hover-highlight="true"
		table-header-bg-color="light"
	>
		<template #header>
			<N8nText :class="$style.title" :bold="true" color="text-light" size="small">
				{{ title }}
			</N8nText>
		</template>

		<template #no-output-data>
			<N8nText :bold="true" color="text-dark" size="large">
				{{ locale.baseText('ndv.output.noOutputData.title') }}
			</N8nText>
		</template>

		<template v-if="isMultipleInput" #content>
			<!-- leave empty -->
		</template>

		<template v-if="isMultipleInput" #callout-message>
			<I18nT keypath="logs.details.body.multipleInputs">
				<template #button>
					<N8nLink size="small" @click="handleClickOpenNdv">
						{{ locale.baseText('logs.details.body.multipleInputs.openingTheNode') }}
					</N8nLink>
				</template>
			</I18nT>
		</template>
	</RunData>
</template>

<style lang="scss" module>
.title {
	text-transform: uppercase;
	letter-spacing: 3px;
}
</style>
