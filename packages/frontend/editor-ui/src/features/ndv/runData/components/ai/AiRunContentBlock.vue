<script lang="ts" setup>
import type { IAiDataContent } from '@/Interface';
import capitalize from 'lodash/capitalize';
import { computed, onMounted, ref, watch } from 'vue';
import type { NodeConnectionType, NodeError } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import RunDataAi from '../RunDataParsedAiContent.vue';
import { parseAiContent } from '@/app/utils/aiUtils';
import { N8nButton, N8nIcon, N8nRadioButtons } from '@n8n/design-system';
import NodeErrorView from '../error/NodeErrorView.vue';
import { saveAs } from 'file-saver';
import { MAX_DISPLAY_DATA_SIZE_LOGS_VIEW } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import NDVEmptyState from '@/features/ndv/panel/components/NDVEmptyState.vue';

const props = defineProps<{
	runData: IAiDataContent;
	error?: NodeError;
}>();

const i18n = useI18n();

// eslint-disable-next-line @typescript-eslint/no-use-before-define
const isExpanded = ref(getInitialExpandedState());
const renderType = ref<'rendered' | 'json'>('rendered');
const dataSize = ref(0);
const showData = ref(false);
const dataSizeInMB = computed(() => (dataSize.value / (1024 * 1024)).toFixed(1));
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

function updateShowData() {
	showData.value = dataSize.value < MAX_DISPLAY_DATA_SIZE_LOGS_VIEW;
}

function refreshDataSize() {
	showData.value = false;
	dataSize.value = new Blob([JSON.stringify(props.runData.data)]).size;

	updateShowData();
}

function onShowDataAnyway() {
	showData.value = true;
}

function downloadJsonData() {
	const fileName = props.runData.inOut === 'input' ? 'input_data' : 'output_data';
	const blob = new Blob([JSON.stringify(props.runData.data, null, 2)], {
		type: 'application/json',
	});

	saveAs(blob, `${fileName}.json`);
}

onMounted(() => {
	refreshDataSize();
});

watch(
	() => props.runData.data,
	() => {
		refreshDataSize();
	},
);
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
				v-else-if="showData"
				:data="runData.data"
				:type="runData.type"
				:content="parsedRun"
				:render-type="renderType"
			/>
			<section v-else :class="$style.warning">
				<NDVEmptyState
					:title="
						i18n.baseText('ndv.tooMuchData.title', {
							interpolate: {
								size: dataSizeInMB,
							},
						})
					"
					:class="$style.warningState"
				>
					<span v-n8n-html="i18n.baseText('ndv.tooMuchData.message')" />
				</NDVEmptyState>
				<div :class="$style.warningActions">
					<N8nButton
						outline
						size="small"
						:label="i18n.baseText('runData.downloadBinaryData')"
						@click.stop="downloadJsonData"
					/>
					<N8nButton
						size="small"
						:label="i18n.baseText('ndv.tooMuchData.showDataAnyway')"
						@click.stop="onShowDataAnyway"
					/>
				</div>
			</section>
		</main>
	</div>
</template>

<style lang="scss" module>
.block {
	padding: var(--spacing--sm) 0 var(--spacing--2xs) var(--spacing--2xs);
	border: 1px solid var(--color--foreground--tint-1);
	margin-top: var(--spacing--sm);
	border-radius: var(--radius);
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
	margin-right: var(--spacing--2xs);

	.block:hover & {
		opacity: 1;
	}
}

.blockHeader {
	display: flex;
	gap: var(--spacing--xs);
	cursor: pointer;
	/* This hack is needed to make the whole surface of header clickable  */
	margin: calc(-1 * var(--spacing--xs));
	padding: var(--spacing--2xs) var(--spacing--xs);
	align-items: center;

	& * {
		user-select: none;
	}
}

.blockTitle {
	font-size: var(--font-size--sm);
	color: var(--color--text--shade-1);
	margin: 0;
	padding-bottom: var(--spacing--4xs);
}

.blockToggle {
	border: none;
	background: none;
	padding: 0;
	color: var(--color--text);
	margin-top: calc(-1 * var(--spacing--3xs));
}

.error {
	padding: var(--spacing--sm) 0;
}

.warning {
	padding: var(--spacing--sm) var(--spacing--md);
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
}

.warningState {
	width: 100%;
}

.warningActions {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--spacing--2xs);
	width: 100%;
	align-items: center;
}

.warningActions :global(.n8n-button) {
	min-width: 9rem;
}
</style>
