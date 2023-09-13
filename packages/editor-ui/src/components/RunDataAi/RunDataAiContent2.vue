<template>
	<div :class="$style.container">
		<header :class="$style.header">
			<node-icon
				:class="$style.nodeIcon"
				v-if="runMeta?.node"
				:node-type="runMeta.node"
				:size="20"
			/>
			<div :class="$style.headerWrap">
				<p :class="$style.title">
					{{ inputData.node }}
				</p>
				<ul :class="$style.meta">
					<li v-if="runMeta?.startTimeMs">{{ runMeta?.executionTimeMs }}ms</li>
					<li v-if="runMeta?.startTimeMs">
						{{
							$locale.baseText('runData.aiContentBlock.startedAt', {
								interpolate: {
									startTime: new Date(runMeta?.startTimeMs).toLocaleString(),
								},
							})
						}}
					</li>
					<li v-if="(consumedTokensSum?.totalTokens ?? 0) > 0">
						{{
							$locale.baseText('runData.aiContentBlock.tokens', {
								interpolate: {
									count: consumedTokensSum?.totalTokens.toString()!,
								},
							})
						}}
						<n8n-info-tip type="tooltip" theme="info-light" tooltipPlacement="right">
							<div>
								<n8n-text :bold="true" size="small">
									{{ $locale.baseText('runData.aiContentBlock.tokens.prompt') }}
									{{
										$locale.baseText('runData.aiContentBlock.tokens', {
											interpolate: {
												count: consumedTokensSum?.promptTokens.toString()!,
											},
										})
									}}
								</n8n-text>
								<br />
								<n8n-text :bold="true" size="small">
									{{ $locale.baseText('runData.aiContentBlock.tokens.completion') }}
									{{
										$locale.baseText('runData.aiContentBlock.tokens', {
											interpolate: {
												count: consumedTokensSum?.completionTokens.toString()!,
											},
										})
									}}
								</n8n-text>
							</div>
						</n8n-info-tip>
					</li>
				</ul>
			</div>
		</header>

		<main :class="$style.content" v-for="(run, index) in props.inputData.data" :key="index">
			<AiRunContentBlock :runData="run" />
		</main>
	</div>
</template>
<style type="scss" module>
.container {
	padding: 0 var(--spacing-s) var(--spacing-s);
}
.nodeIcon {
	margin-top: calc(var(--spacing-3xs) * -1);
}
.header {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
	margin-bottom: var(--spacing-s);
}
.headerWrap {
	display: flex;
	flex-direction: column;
}
.title {
	display: flex;
	align-items: center;
	font-size: var(--font-size-s);
	gap: var(--spacing-3xs);
	color: var(--color-text-dark);
}
.meta {
	list-style: none;
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	font-size: var(--font-size-xs);

	& > li:not(:last-child) {
		border-right: 1px solid var(--color-text-base);
		padding-right: var(--spacing-3xs);
	}

	& > li:not(:first-child) {
		padding-left: var(--spacing-3xs);
	}
}
</style>

<script lang="ts" setup>
import type { EndpointType, IAiData, IAiDataContent } from '@/Interface';
import { useNodeTypesStore, useWorkflowsStore } from '@/stores';
import type { IDataObject, INodeExecutionData, INodeTypeDescription } from 'n8n-workflow';
import { computed } from 'vue';
import NodeIcon from '@/components/NodeIcon.vue';
import AiRunContentBlock from './AiRunContentBlock.vue';
import { DateTime } from 'luxon';

interface RunMeta {
	startTimeMs: number;
	executionTimeMs: number;
	promptTokens: number;
	completionTokens: number;
	node: INodeTypeDescription | null;
	type: 'input' | 'output';
	connectionType: EndpointType;
}
const props = defineProps<{
	inputData: IAiData;
	contentIndex: number;
}>();

const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();

type TokenUsageData = {
	completionTokens: number;
	promptTokens: number;
	totalTokens: number;
};
const consumedTokensSum = computed(() => {
	// eslint-disable-next-line @typescript-eslint/no-use-before-define
	const consumedTokensSum1 = outputRun.value?.data?.reduce(
		(acc: TokenUsageData, curr: INodeExecutionData) => {
			const response = curr.json?.response as IDataObject;
			const tokenUsageData = (response?.llmOutput as IDataObject)?.tokenUsage as TokenUsageData;

			if (!tokenUsageData) return acc;

			return {
				completionTokens: acc.completionTokens + tokenUsageData.completionTokens,
				promptTokens: acc.promptTokens + tokenUsageData.promptTokens,
				totalTokens: acc.totalTokens + tokenUsageData.totalTokens,
			};
		},
		{
			completionTokens: 0,
			promptTokens: 0,
			totalTokens: 0,
		},
	);

	return consumedTokensSum1;
});

function extractRunMeta(run: IAiDataContent) {
	const uiNode = workflowsStore.getNodeByName(props.inputData.node);
	const nodeType = nodeTypesStore.getNodeType(uiNode?.type ?? '');
	const startTime = DateTime.fromSeconds(run.metadata.startTime);
	console.log('🚀 ~ file: RunDataAiContent2.vue:168 ~ extractRunMeta ~ startTime:', startTime);
	const runMeta: RunMeta = {
		startTimeMs: run.metadata.startTime,
		executionTimeMs: run.metadata.executionTime,
		promptTokens: 0,
		completionTokens: 0,
		node: nodeType,
		type: run.inOut,
		connectionType: run.type,
	};

	return runMeta;
}

const outputRun = computed(() => {
	return props.inputData.data.find((r) => r.inOut === 'output');
});

const runMeta = computed(() => {
	if (outputRun.value === undefined) {
		return;
	}
	return extractRunMeta(outputRun.value);
});
</script>
