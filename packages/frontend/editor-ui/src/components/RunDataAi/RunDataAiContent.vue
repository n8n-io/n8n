<script lang="ts" setup>
import type { IAiData, IAiDataContent } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type {
	INodeExecutionData,
	INodeTypeDescription,
	NodeConnectionType,
	NodeError,
} from 'n8n-workflow';
import { computed } from 'vue';
import NodeIcon from '@/components/NodeIcon.vue';
import AiRunContentBlock from './AiRunContentBlock.vue';
import { useExecutionHelpers } from '@/composables/useExecutionHelpers';
import { useI18n } from '@/composables/useI18n';

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
	inputData: IAiData;
	contentIndex: number;
}>();

const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();

const { trackOpeningRelatedExecution, resolveRelatedExecutionUrl } = useExecutionHelpers();
const i18n = useI18n();

type TokenUsageData = {
	completionTokens: number;
	promptTokens: number;
	totalTokens: number;
};

const consumedTokensSum = computed(() => {
	// eslint-disable-next-line @typescript-eslint/no-use-before-define
	const tokenUsage = outputRun.value?.data?.reduce(
		(acc: TokenUsageData, curr: INodeExecutionData) => {
			const tokenUsageData = (curr.json?.tokenUsage ??
				curr.json?.tokenUsageEstimate) as TokenUsageData;

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

	return tokenUsage;
});

const usingTokensEstimates = computed(() => {
	return outputRun.value?.data?.some((d) => d.json?.tokenUsageEstimate);
});

function formatTokenUsageCount(count: number) {
	return usingTokensEstimates.value ? `~${count}` : count.toString();
}
function extractRunMeta(run: IAiDataContent) {
	const uiNode = workflowsStore.getNodeByName(props.inputData.node);
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
	return props.inputData.data.find((r) => r.inOut === 'output');
});

const runMeta = computed(() => {
	if (outputRun.value === undefined) {
		return;
	}
	return extractRunMeta(outputRun.value);
});

const executionRunData = computed(() => {
	return workflowsStore.getWorkflowExecution?.data?.resultData?.runData;
});

const outputError = computed(() => {
	return executionRunData.value?.[props.inputData.node]?.[props.inputData.runIndex]?.error as
		| NodeError
		| undefined;
});
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
					{{ inputData.node }}
				</p>
				<ul :class="$style.meta">
					<li v-if="runMeta?.startTimeMs">{{ runMeta?.executionTimeMs }}ms</li>
					<li v-if="runMeta?.startTimeMs">
						<n8n-tooltip>
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
						</n8n-tooltip>
					</li>
					<li v-if="runMeta?.subExecution">
						<a
							:href="resolveRelatedExecutionUrl(runMeta)"
							target="_blank"
							@click.stop="trackOpeningRelatedExecution(runMeta, 'ai')"
						>
							<N8nIcon icon="external-link-alt" size="xsmall" />
							{{ i18n.baseText('runData.openSubExecutionSingle') }}
						</a>
					</li>
					<li v-if="(consumedTokensSum?.totalTokens ?? 0) > 0" :class="$style.tokensUsage">
						{{
							i18n.baseText('runData.aiContentBlock.tokens', {
								interpolate: {
									count: formatTokenUsageCount(consumedTokensSum?.totalTokens ?? 0),
								},
							})
						}}
						<n8n-info-tip type="tooltip" theme="info-light" tooltip-placement="right">
							<div>
								<n8n-text :bold="true" size="small">
									{{ i18n.baseText('runData.aiContentBlock.tokens.prompt') }}
									{{
										i18n.baseText('runData.aiContentBlock.tokens', {
											interpolate: {
												count: formatTokenUsageCount(consumedTokensSum?.promptTokens ?? 0),
											},
										})
									}}
								</n8n-text>
								<br />
								<n8n-text :bold="true" size="small">
									{{ i18n.baseText('runData.aiContentBlock.tokens.completion') }}
									{{
										i18n.baseText('runData.aiContentBlock.tokens', {
											interpolate: {
												count: formatTokenUsageCount(consumedTokensSum?.completionTokens ?? 0),
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

		<main v-for="(run, index) in props.inputData.data" :key="index" :class="$style.content">
			<AiRunContentBlock
				:run-data="run"
				:error="run.inOut === 'output' ? outputError : undefined"
			/>
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
.tokensUsage {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
}
</style>
