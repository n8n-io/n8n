<script setup lang="ts">
import RunData from '@/components/RunData.vue';
import { type LogEntry } from '@/components/RunDataAi/utils';
import { useI18n } from '@/composables/useI18n';
import { type IRunDataDisplayMode, type IExecutionResponse, type NodePanelType } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { N8nLink, N8nText } from '@n8n/design-system';
import { type Workflow } from 'n8n-workflow';
import { computed, ref } from 'vue';
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

const displayMode = ref<IRunDataDisplayMode>(paneType === 'input' ? 'schema' : 'table');
const isMultipleInput = computed(() => paneType === 'input' && logEntry.runData.source.length > 1);
const runDataProps = computed<
	Pick<InstanceType<typeof RunData>['$props'], 'node' | 'runIndex' | 'overrideOutputs'> | undefined
>(() => {
	if (logEntry.depth > 0 || paneType === 'output') {
		return { node: logEntry.node, runIndex: logEntry.runIndex };
	}

	const source = logEntry.runData.source[0];
	const node = source && workflow.getNode(source.previousNode);

	if (!source || !node) {
		return undefined;
	}

	return {
		node,
		runIndex: source.previousNodeRun ?? 0,
		overrideOutputs: [source.previousNodeOutput ?? 0],
	};
});

function handleClickOpenNdv() {
	ndvStore.setActiveNodeName(logEntry.node.name);
}

function handleChangeDisplayMode(value: IRunDataDisplayMode) {
	displayMode.value = value;
}
</script>

<template>
	<RunData
		v-if="runDataProps"
		v-bind="runDataProps"
		:workflow="workflow"
		:workflow-execution="execution"
		:too-much-data-title="locale.baseText('ndv.output.tooMuchData.title')"
		:no-data-in-branch-message="locale.baseText('ndv.output.noOutputDataInBranch')"
		:executing-message="locale.baseText('ndv.output.executing')"
		:pane-type="paneType"
		:disable-run-index-selection="true"
		:compact="true"
		:disable-pin="true"
		:disable-edit="true"
		:disable-hover-highlight="true"
		:display-mode="displayMode"
		:disable-ai-content="logEntry.depth === 0"
		table-header-bg-color="light"
		@display-mode-change="handleChangeDisplayMode"
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
