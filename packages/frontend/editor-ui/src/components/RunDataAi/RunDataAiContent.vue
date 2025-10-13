<script lang="ts" setup>
import type { IAiDataContent } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { INodeTypeDescription, NodeConnectionType, NodeError } from 'n8n-workflow';
import { computed } from 'vue';
import NodeIcon from '@/components/NodeIcon.vue';
import AiRunContentBlock from './AiRunContentBlock.vue';
import { useI18n } from '@n8n/i18n';
import { getConsumedTokens } from '@/features/logs/logs.utils';
import ConsumedTokensDetails from '@/components/ConsumedTokensDetails.vue';
import ViewSubExecution from '../ViewSubExecution.vue';
import { formatTokenUsageCount } from '@/utils/aiUtils';
import { getReferencedData } from '@/components/RunDataAi/utils';
import { type LogEntry } from '@/features/logs/logs.types';

import { N8nInfoTip, N8nTooltip } from '@n8n/design-system';
interface RunMeta {
	startTimeMs: number;
	executionTimeMs: number;
	node: INodeTypeDescription | null;
	type: 'input' | 'output';
	connectionType: NodeConnectionType;
	subExecution?: {
		workflowId: string;
		executionId: string;
	};
}
const props = defineProps<{
	inputData: LogEntry;
}>();

const data = computed(() =>
	props.inputData.runData ? getReferencedData(props.inputData.runData) : undefined,
);

const nodeTypesStore = useNodeTypesStore();

const i18n = useI18n();

const consumedTokensSum = computed(() => getConsumedTokens(outputRun.value?.data ?? []));

function extractRunMeta(run: IAiDataContent) {
	const uiNode = props.inputData.node;
	const nodeType = nodeTypesStore.getNodeType(uiNode?.type ?? '');

	const runMeta: RunMeta = {
		startTimeMs: run.metadata.startTime,
		executionTimeMs: run.metadata.executionTime,
		node: nodeType,
		type: run.inOut,
		connectionType: run.type,
		subExecution: run.metadata?.subExecution,
	};

	return runMeta;
}

const outputRun = computed(() => {
	return data.value?.find((r) => r.inOut === 'output');
});

const runMeta = computed(() => {
	if (outputRun.value === undefined) {
		return;
	}
	return extractRunMeta(outputRun.value);
});

const outputError = computed(() => props.inputData.runData?.error as NodeError | undefined);
</script>

<template>
	<div :class="$style.container">
		<header :class="$style.header">
			<NodeIcon
				v-if="runMeta?.node"
				:class="$style.nodeIcon"
				:node-type="runMeta.node"
				:size="20"
			/>
			<div :class="$style.headerWrap">
				<p :class="$style.title">
					{{ inputData.node.name }}
				</p>
				<ul :class="$style.meta">
					<li v-if="runMeta?.startTimeMs">{{ runMeta?.executionTimeMs }}ms</li>
					<li v-if="runMeta?.startTimeMs">
						<N8nTooltip>
							<template #content>
								{{ new Date(runMeta?.startTimeMs).toLocaleString() }}
							</template>
							{{
								i18n.baseText('runData.aiContentBlock.startedAt', {
									interpolate: {
										startTime: new Date(runMeta?.startTimeMs).toLocaleTimeString(),
									},
								})
							}}
						</N8nTooltip>
					</li>
					<li v-if="runMeta">
						<ViewSubExecution :task-metadata="runMeta" :display-mode="'ai'" :inline="true" />
					</li>
					<li v-if="(consumedTokensSum?.totalTokens ?? 0) > 0" :class="$style.tokensUsage">
						{{
							i18n.baseText('runData.aiContentBlock.tokens', {
								interpolate: {
									count: formatTokenUsageCount(consumedTokensSum, 'total'),
								},
							})
						}}
						<N8nInfoTip type="tooltip" theme="info-light" tooltip-placement="right">
							<ConsumedTokensDetails :consumed-tokens="consumedTokensSum" />
						</N8nInfoTip>
					</li>
				</ul>
			</div>
		</header>

		<main v-for="(run, index) in data ?? []" :key="index" :class="$style.content">
			<AiRunContentBlock
				:run-data="run"
				:error="run.inOut === 'output' ? outputError : undefined"
			/>
		</main>
	</div>
</template>

<style type="scss" module>
.container {
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}
.nodeIcon {
	margin-top: calc(var(--spacing--3xs) * -1);
}
.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-bottom: var(--spacing--sm);
}
.headerWrap {
	display: flex;
	flex-direction: column;
}
.title {
	display: flex;
	align-items: center;
	font-size: var(--font-size--sm);
	gap: var(--spacing--3xs);
	color: var(--color--text--shade-1);
}
.meta {
	list-style: none;
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	font-size: var(--font-size--xs);

	& > li:not(:last-child) {
		border-right: 1px solid var(--color--text);
		padding-right: var(--spacing--3xs);
	}

	& > li:not(:first-child) {
		padding-left: var(--spacing--3xs);
	}
}
.tokensUsage {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
