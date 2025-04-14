<script setup lang="ts">
import RunData from '@/components/RunData.vue';
import { type TreeNode } from '@/components/RunDataAi/utils';
import { useI18n } from '@/composables/useI18n';
import { type NodePanelType } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { N8nLink, N8nText } from '@n8n/design-system';
import { uniqBy } from 'lodash-es';
import { computed } from 'vue';
import { I18nT } from 'vue-i18n';

const { title, logEntry, paneType } = defineProps<{
	title: string;
	paneType: NodePanelType;
	logEntry: TreeNode;
}>();

const locale = useI18n();
const workflowsStore = useWorkflowsStore();
const ndvStore = useNDVStore();
const workflow = computed(() => workflowsStore.getCurrentWorkflow());
const node = computed(() => {
	if (logEntry.depth > 0 || paneType === 'output') {
		return workflowsStore.nodesByName[logEntry.node];
	}

	const parent = workflow.value.getParentNodesByDepth(logEntry.node)[0];

	if (!parent) {
		return undefined;
	}

	return workflowsStore.nodesByName[parent.name];
});
const isMultipleInput = computed(
	() =>
		paneType === 'input' &&
		uniqBy(
			workflow.value.getParentNodesByDepth(logEntry.node).filter((n) => n.name !== logEntry.node),
			(n) => n.name,
		).length > 1,
);

function handleClickOpenNdv() {
	ndvStore.setActiveNodeName(logEntry.node);
}
</script>

<template>
	<RunData
		v-if="node"
		:node="node"
		:workflow="workflow"
		:run-index="logEntry.runIndex"
		:too-much-data-title="locale.baseText('ndv.output.tooMuchData.title')"
		:no-data-in-branch-message="locale.baseText('ndv.output.noOutputDataInBranch')"
		:executing-message="locale.baseText('ndv.output.executing')"
		:pane-type="paneType"
		:disable-run-index-selection="true"
		:compact="true"
		:disable-pin="true"
		:disable-edit="true"
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
