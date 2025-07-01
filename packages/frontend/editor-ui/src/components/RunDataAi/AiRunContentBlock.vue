<script lang="ts" setup>
import type { IAiDataContent } from '@/Interface';
import capitalize from 'lodash/capitalize';
import { computed, ref } from 'vue';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { NodeConnectionType, NodeError } from 'n8n-workflow';
import RunDataAi from '@/components/RunDataParsedAiContent.vue';
import { parseAiContent } from '@/utils/aiUtils';
import { N8nRadioButtons } from '@n8n/design-system';

const props = defineProps<{
	runData: IAiDataContent;
	error?: NodeError;
}>();

// eslint-disable-next-line @typescript-eslint/no-use-before-define
const isExpanded = ref(getInitialExpandedState());
const renderType = ref<'rendered' | 'json'>('rendered');
const parsedRun = computed(() => parseAiContent(props.runData.data ?? [], props.runData.type));
const contentParsed = computed(() =>
	parsedRun.value.some((item) => item.parsedContent?.parsed === true),
);

function getInitialExpandedState() {
	const collapsedTypes = {
		input: [
			NodeConnectionTypes.AiDocument,
			NodeConnectionTypes.AiTextSplitter,
		] as NodeConnectionType[],
		output: [
			NodeConnectionTypes.AiDocument,
			NodeConnectionTypes.AiEmbedding,
			NodeConnectionTypes.AiTextSplitter,
			NodeConnectionTypes.AiVectorStore,
		] as NodeConnectionType[],
	};

	return !collapsedTypes[props.runData.inOut].includes(props.runData.type);
}

function onBlockHeaderClick() {
	isExpanded.value = !isExpanded.value;
}

function onRenderTypeChange(value: 'rendered' | 'json') {
	renderType.value = value;
}
</script>

<template>
	<div :class="$style.block">
		<header :class="$style.blockHeader" @click="onBlockHeaderClick">
			<button :class="$style.blockToggle">
				<N8nIcon :icon="isExpanded ? 'chevron-down' : 'chevron-right'" size="large" />
			</button>
			<p :class="$style.blockTitle">{{ capitalize(runData.inOut) }}</p>
			<N8nRadioButtons
				v-if="contentParsed && !error && isExpanded"
				size="small"
				:model-value="renderType"
				:class="$style.rawSwitch"
				:options="[
					{ label: 'Rendered', value: 'rendered' },
					{ label: 'JSON', value: 'json' },
				]"
				@update:model-value="onRenderTypeChange"
			/>
		</header>
		<main
			:class="{
				[$style.blockContent]: true,
				[$style.blockContentExpanded]: isExpanded,
			}"
		>
			<NodeErrorView v-if="error" :error="error" :class="$style.error" show-details />
			<RunDataAi
				v-else
				:data="runData.data"
				:type="runData.type"
				:content="parsedRun"
				:render-type="renderType"
			/>
		</main>
	</div>
</template>

<style lang="scss" module>
.block {
	padding: var(--spacing-s) 0 var(--spacing-2xs) var(--spacing-2xs);
	border: 1px solid var(--color-foreground-light);
	margin-top: var(--spacing-s);
	border-radius: var(--border-radius-base);
}

:root .blockContent {
	height: 0;
	overflow: hidden;

	&.blockContentExpanded {
		height: auto;
	}
}

.rawSwitch {
	opacity: 0;
	height: fit-content;
	margin-left: auto;
	margin-right: var(--spacing-2xs);

	.block:hover & {
		opacity: 1;
	}
}

.blockHeader {
	display: flex;
	gap: var(--spacing-xs);
	cursor: pointer;
	/* This hack is needed to make the whole surface of header clickable  */
	margin: calc(-1 * var(--spacing-xs));
	padding: var(--spacing-2xs) var(--spacing-xs);
	align-items: center;

	& * {
		user-select: none;
	}
}

.blockTitle {
	font-size: var(--font-size-s);
	color: var(--color-text-dark);
	margin: 0;
	padding-bottom: var(--spacing-4xs);
}

.blockToggle {
	border: none;
	background: none;
	padding: 0;
	color: var(--color-text-base);
	margin-top: calc(-1 * var(--spacing-3xs));
}

.error {
	padding: var(--spacing-s) 0;
}
</style>
